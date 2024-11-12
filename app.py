
from flask import Flask, request, jsonify, url_for, render_template
import requests
import numpy as np
import logging
from datetime import datetime, timedelta
import psycopg2
import rasterio
import os 
import fiona
from rasterio.mask import mask
from psycopg2 import sql
from shapely.geometry import box, mapping, shape
import xarray as xr



app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static'

@app.route('/')
def home():
  return render_template('home.html')

@app.route('/nelson')
def index():
    return render_template('nelson.html')



    
# Define the path to your NetCDF files
netcdf_files = {
    'mean': os.path.expanduser('~/Nelson_Model/netcdf_data/files/100hr_mean.nc'),
    'median': os.path.expanduser('~/Nelson_Model/netcdf_data/files/100hr_median.nc'),
    'outer': os.path.expanduser('~/Nelson_Model/netcdf_data/files/100hr_outer.nc'),
    'precipitation': os.path.expanduser('~/Nelson_Model/netcdf_data/files/precipitation.nc'),
}

def get_nearest_point_data(netcdf_file, input_x, input_y):
    # Load the NetCDF file
    ds = xr.open_dataset(netcdf_file)
    
    # Find the nearest point to the input coordinates
    nearest_data = ds.sel(x=input_x, y=input_y, method='nearest')
    
    return nearest_data

@app.route('/get_all_data')
def get_all_data():
    input_x = float(request.args.get('lng'))
    input_y = float(request.args.get('lat'))

    # Access data from the NetCDF files
    mean_data = get_nearest_point_data(netcdf_files['mean'], input_x, input_y)
    median_data = get_nearest_point_data(netcdf_files['median'], input_x, input_y)
    outer_data = get_nearest_point_data(netcdf_files['outer'], input_x, input_y)
    precip_data = get_nearest_point_data(netcdf_files['precipitation'], input_x, input_y)

    # Extract the times and values
    times_ns = mean_data['time'].values  # Assuming time is a common dimension in nanoseconds
    times = [np.datetime_as_string(np.datetime64(time, 'ns'), unit='s') for time in times_ns]

    # Format times to match "YYYY-MM-DDTHH:00:00"
    formatted_times = []
    for time in times:
        dt = np.datetime64(time, 's')
        dt_str = str(dt)
        date_part, time_part = dt_str.split('T')
        hour = time_part.split(':')[0]
        formatted_times.append(f"{date_part}T{hour}:00:00")

    mean_values = mean_data['fuel_moisture'].values.tolist()  # Adjust 'fuel_moisture' as per your variable name
    median_values = median_data['fuel_moisture'].values.tolist()  # Adjust 'fuel_moisture' as per your variable name
    outer_values = outer_data['fuel_moisture'].values.tolist()  # Adjust 'fuel_moisture' as per your variable name
    precip_values = precip_data['fuel_moisture'].values.tolist()  # Adjust 'precipitation' as per your variable name

    # Print the extracted data for debugging purposes
    print("Formatted Times:", formatted_times)
    print("Mean Values:", mean_values)
    print("Median Values:", median_values)
    print("Outer Values:", outer_values)
    print("Precipitation Values:", precip_values)

    return jsonify({
        'precipitation': {'times': formatted_times, 'values': precip_values},
        'outer': {'times': formatted_times, 'values': outer_values},
        'mean': {'times': formatted_times, 'values': mean_values},
        'median': {'times': formatted_times, 'values': median_values}
    })


def create_wps_payload(coverage_id_1, coverage_id_2):
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<wps:Execute version="1.0.0" service="WPS" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:xlink="http://www.w3.org/1999/xlink">
  <ows:Identifier>ras:Jiffle</ows:Identifier>
  <wps:DataInputs>
    <wps:Input>
      <ows:Identifier>coverage</ows:Identifier>
      <wps:Reference mimeType="image/tiff" xlink:href="http://localhost:8080/geoserver/ows" method="POST">
        <wps:Body>
          <![CDATA[
          <wcs:GetCoverage service="WCS" version="2.0.1" xmlns:wcs="http://www.opengis.net/wcs/2.0">
            <wcs:CoverageId>{coverage_id_1}</wcs:CoverageId>
            <wcs:Format>image/tiff</wcs:Format>
          </wcs:GetCoverage>
          ]]>
        </wps:Body>
      </wps:Reference>
    </wps:Input>
    <wps:Input>
      <ows:Identifier>coverage</ows:Identifier>
      <wps:Reference mimeType="image/tiff" xlink:href="http://localhost:8080/geoserver/ows" method="POST">
        <wps:Body>
          <![CDATA[
          <wcs:GetCoverage service="WCS" version="2.0.1" xmlns:wcs="http://www.opengis.net/wcs/2.0">
            <wcs:CoverageId>{coverage_id_2}</wcs:CoverageId>
            <wcs:Format>image/tiff</wcs:Format>
          </wcs:GetCoverage>
          ]]>
        </wps:Body>
      </wps:Reference>
    </wps:Input>
    <wps:Input>
      <ows:Identifier>script</ows:Identifier>
      <wps:Data>
        <wps:LiteralData>if (src1[0] == -255 || src2[0] == -255 ) {{ 
            dest = -255; 
        }} else {{ 
            band1 = src1[0]; 
            band2 = src2[0]; 
            dest = band1-band2;
        }}</wps:LiteralData>
      </wps:Data>
    </wps:Input>
    <wps:Input>
      <ows:Identifier>sourceName</ows:Identifier>
      <wps:Data>
        <wps:LiteralData>src1</wps:LiteralData>
      </wps:Data>
    </wps:Input>
    <wps:Input>
      <ows:Identifier>sourceName</ows:Identifier>
      <wps:Data>
        <wps:LiteralData>src2</wps:LiteralData>
      </wps:Data>
    </wps:Input>
    <wps:Input>
      <ows:Identifier>outputType</ows:Identifier>
      <wps:Data>
        <wps:LiteralData>DOUBLE</wps:LiteralData>
      </wps:Data>
    </wps:Input>
    <wps:Input>
      <ows:Identifier>bandCount</ows:Identifier>
      <wps:Data>
        <wps:LiteralData>1</wps:LiteralData>
      </wps:Data>
    </wps:Input>
  </wps:DataInputs>
  <wps:ResponseForm>
    <wps:RawDataOutput mimeType="image/tiff">
      <ows:Identifier>result</ows:Identifier>
    </wps:RawDataOutput>
  </wps:ResponseForm>
</wps:Execute>'''

def send_wps_request(coverage_id_1, coverage_id_2):
    url = "http://localhost:8080/geoserver/ows"
    headers = {'Content-Type': 'text/xml'}
    data = create_wps_payload(coverage_id_1, coverage_id_2)
    
    response = requests.post(url, headers=headers, data=data)
    
    if response.status_code != 200:
        print(f"WPS request failed with status code: {response.status_code}")
        return None
    
    print("WPS request succeeded")
    return response.content

def clip_raster_with_shapefile(raster_data, shapefile_path, output_filepath):
    with fiona.open(shapefile_path, "r") as shapefile:
        shapes = [shape(feature["geometry"]) for feature in shapefile]
    
    with rasterio.open(raster_data) as src:
        out_image, out_transform = mask(src, shapes, crop=True, nodata=-255)
        out_meta = src.meta.copy()

        out_meta.update({
            "driver": "GTiff",
            "height": out_image.shape[1],
            "width": out_image.shape[2],
            "transform": out_transform,
            "nodata": -255
        })

        with rasterio.open(output_filepath, "w", **out_meta) as dest:
            dest.write(out_image)
        print(f"Clipped image saved as {output_filepath}")

@app.route('/process_raster', methods=['POST'])
def process_raster():
    coverage_id_1 = request.args.get('coverage1')
    coverage_id_2 = request.args.get('coverage2')
    
    print("Processing raster with the following coverages:")
    print(f"Coverage 1: {coverage_id_1}")
    print(f"Coverage 2: {coverage_id_2}")

    # Send WPS request and get the result
    result_raster_data = send_wps_request(coverage_id_1, coverage_id_2)
    
    if result_raster_data is None:
        return jsonify({'error': 'WPS request failed'}), 500

    result_filepath = "result.tiff"
    with open(result_filepath, "wb") as f:
        f.write(result_raster_data)

    # Clip the raster
    shapefile_path = "./Northern Rockies..shp"
    output_clipped_filepath = os.path.join(app.config['UPLOAD_FOLDER'], "clipped_result.tiff")
    
    clip_raster_with_shapefile(result_filepath, shapefile_path, output_clipped_filepath)

    # Return the URL for the clipped file
    file_url = url_for('static', filename='clipped_result.tiff', _external=True)
    print(f"Returning file URL: {file_url}")
    
    return jsonify({'url': file_url})

if __name__ == '__main__':
    app.run(debug=True, port=8081 )

