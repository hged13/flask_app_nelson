from flask import Flask, request, jsonify, url_for, render_template
import requests
import numpy as np
import logging
from datetime import datetime, timedelta
import rasterio
import os 
import fiona
from rasterio.mask import mask
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

cdf_files_dir = os.path.expanduser('~/Nelson_Model/geoserver_new/geoserver/data_dir/cdf_files')
    
# Define the path to your NetCDF files relative to the base directory
netcdf_files = {
    '1hr': os.path.join(cdf_files_dir, '1hr_fm.nc'),
    '10hr': os.path.join(cdf_files_dir, '10hr_fm.nc'),
    '100hr': os.path.join(cdf_files_dir, '100hr_fuelmoisture.nc'),
    'precipitation': os.path.join(cdf_files_dir, 'precipitation_nans_repro.nc')
}

def get_nearest_point_data(netcdf_file, input_x, input_y):
    # Load the NetCDF file
    ds = xr.open_dataset(netcdf_file)
    
    # Find the nearest point to the input coordinates
    nearest_data = ds.sel(x=input_x, y=input_y, method='nearest')
    
    return nearest_data



@app.route('/get_metadata', methods=['GET'])
def get_metadata():

  netcdf_file_path = netcdf_files['precipitation']

  # Get the time index from the request
  time_index = request.args.get('time', type=int)
  if time_index is None:
      return jsonify({"error": "Time index is required"}), 400

  try:
      # Open the NetCDF file
      ds = xr.open_dataset(netcdf_file_path)

      # Ensure time index is within bounds
      if time_index < 0 or time_index >= len(ds["time"]):
          return jsonify({"error": f"Time index {time_index} is out of bounds"}), 400

      # Extract the specific time slice for the variable
      variable = "fuel_moisture"  # Replace with your variable name
      data_slice = ds[variable].isel(time=time_index)

      
      max_value = float(data_slice.max().values)
      

      # Return the metadata as JSON
      return jsonify({
          
          "max": max_value,
          
      })

  except FileNotFoundError:
      return jsonify({"error": "NetCDF file not found"}), 500
  except Exception as e:
      return jsonify({"error": str(e)}), 500



@app.route('/get_all_data')
def get_all_data():
    input_x = float(request.args.get('lng'))
    input_y = float(request.args.get('lat'))
    hour_type = request.args.get('hour')


    # Access data from the NetCDF files
    onehr_data = get_nearest_point_data(netcdf_files[hour_type], input_x, input_y)
    precip_data = get_nearest_point_data(netcdf_files['precipitation'], input_x, input_y)

    # Extract the times and values
    times_ns = onehr_data['time'].values  # Assuming time is a common dimension in nanoseconds
    times = [np.datetime_as_string(np.datetime64(time, 'ns'), unit='s') for time in times_ns]

    # Format times to match "YYYY-MM-DDTHH:00:00"
    formatted_times = []
    for time in times:
        dt = np.datetime64(time, 's')
        dt_str = str(dt)
        date_part, time_part = dt_str.split('T')
        hour = time_part.split(':')[0]
        formatted_times.append(f"{date_part}T{hour}:00:00")

    mean_values = onehr_data['mean_fm'].values.tolist()  # Adjust 'fuel_moisture' as per your variable name
    median_values = onehr_data['median_fm'].values.tolist()  # Adjust 'fuel_moisture' as per your variable name
    outer_values = onehr_data['outer_fm'].values.tolist()  # Adjust 'fuel_moisture' as per your variable name
    precip_values = precip_values = [None if np.isnan(x) else x for x in precip_data['fuel_moisture'].values.tolist()]  # Adjust 'precipitation' as per your variable name

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



def create_wps_payload_cdfs(coverage_id_1, coverage_id_2, time1, time2):
    return f'''<?xml version="1.0" encoding="UTF-8"?><wps:Execute version="1.0.0" service="WPS" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.opengis.net/wps/1.0.0" xmlns:wfs="http://www.opengis.net/wfs" xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:gml="http://www.opengis.net/gml" xmlns:ogc="http://www.opengis.net/ogc" xmlns:wcs="http://www.opengis.net/wcs/1.1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 http://schemas.opengis.net/wps/1.0.0/wpsAll.xsd">
<ows:Identifier>ras:Jiffle</ows:Identifier>
<wps:DataInputs>
  <wps:Input>
    <ows:Identifier>coverage</ows:Identifier>
    <wps:Reference mimeType="image/tiff" xlink:href="http://geoserver/wcs" method="POST">
      <wps:Body>
        <wcs:GetCoverage service="WCS" version="2.0.1"
        xmlns:wcs="http://www.opengis.net/wcs/2.0"
        xmlns:crs="http://www.opengis.net/spec/WCS_service-extension_crs/1.0"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.opengis.net/wcs/2.0 http://schemas.opengis.net/wcs/2.0/wcsAll.xsd">
          <wcs:CoverageId>{coverage_id_1}</wcs:CoverageId>
          <wcs:DimensionTrim>
            <wcs:Dimension>time</wcs:Dimension>
            <wcs:TrimLow>{time1}</wcs:TrimLow>
            <wcs:TrimHigh>{time1}</wcs:TrimHigh>
          </wcs:DimensionTrim>
        </wcs:GetCoverage>
      </wps:Body>
    </wps:Reference>
  </wps:Input>
   <wps:Input>
    <ows:Identifier>coverage</ows:Identifier>
    <wps:Reference mimeType="image/tiff" xlink:href="http://geoserver/wcs" method="POST">
      <wps:Body>
        <wcs:GetCoverage service="WCS" version="2.0.1"
        xmlns:wcs="http://www.opengis.net/wcs/2.0"
        xmlns:crs="http://www.opengis.net/spec/WCS_service-extension_crs/1.0"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.opengis.net/wcs/2.0 http://schemas.opengis.net/wcs/2.0/wcsAll.xsd">
          <wcs:CoverageId>{coverage_id_2}</wcs:CoverageId>
          <wcs:DimensionTrim>
            <wcs:Dimension>time</wcs:Dimension>
            <wcs:TrimLow>{time2}</wcs:TrimLow>
            <wcs:TrimHigh>{time2}</wcs:TrimHigh>
          </wcs:DimensionTrim>
        </wcs:GetCoverage>
      </wps:Body>
    </wps:Reference>
  </wps:Input>
  <wps:Input>
    <ows:Identifier>script</ows:Identifier>
    <wps:Data>
      <wps:LiteralData>if (src[0] == -255 || src1[0] == -255 ) {{ 
            dest = -255; 
        }} else {{ 
            dest = src[0]-src1[0];
        }}</wps:LiteralData>
    </wps:Data>
  </wps:Input>
</wps:DataInputs>
<wps:ResponseForm>
  <wps:RawDataOutput mimeType="image/tiff">
    <ows:Identifier>result</ows:Identifier>
  </wps:RawDataOutput>
</wps:ResponseForm>
</wps:Execute>'''

def send_wps_request(coverage_id_1, coverage_id_2, time1, time2):
    url = "http://greynathan-Precision-7920-Tower:8080/geoserver/ows"
    headers = {'Content-Type': 'text/xml'}
    data = create_wps_payload_cdfs(coverage_id_1, coverage_id_2, time1, time2)
    
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
    import os
    from flask import jsonify, request, url_for

    coverage_id_1 = request.args.get('coverage1')
    coverage_id_2 = request.args.get('coverage2')

    time1 = request.args.get('time1')
    time2 = request.args.get('time2')
    
    print("Processing raster with the following coverages:")
    print(f"Coverage 1: {coverage_id_1}")
    print(f"Coverage 2: {coverage_id_2}")

    # Send WPS request and get the result
    result_raster_data = send_wps_request(coverage_id_1, coverage_id_2, time1, time2)
    print(result_raster_data.decode(errors='replace'))
    if result_raster_data is None:
        print("WPS request failed: No data received.")
        return jsonify({'error': 'WPS request failed'}), 500

    print(f"Size of received raster data: {len(result_raster_data)} bytes")
    if len(result_raster_data) < 100:
        print("Warning: Received raster data is unusually small. Check WPS response.")
        print("Preview of data:", result_raster_data[:100])

    # Write the raster data to a file
    result_filepath = "result.tiff"
    try:
        with open(result_filepath, "wb") as f:
            f.write(result_raster_data)
        print(f"Raster data written to file: {result_filepath}")
    except Exception as e:
        print(f"Error writing raster data to file: {e}")
        return jsonify({'error': 'Failed to write raster data to file'}), 500

    # Verify the file format and metadata using gdalinfo (or equivalent library in Python)
    print("Verifying raster file with GDAL...")
    try:
        import subprocess
        gdalinfo_output = subprocess.check_output(["gdalinfo", result_filepath], text=True)
        print("GDAL Info Output:")
        print(gdalinfo_output)
    except FileNotFoundError:
        print("GDAL is not installed or not found in the system path.")
    except Exception as e:
        print(f"Error verifying raster with GDAL: {e}")

    # Clip the raster (if applicable)
    shapefile_path = "./Northern Rockies..shp"
    output_clipped_filepath = os.path.join(app.config['UPLOAD_FOLDER'], "clipped_result.tiff")
    
    try:
        clip_raster_with_shapefile(result_filepath, shapefile_path, output_clipped_filepath)
        print(f"Raster clipped successfully. Output file: {output_clipped_filepath}")
    except Exception as e:
        print(f"Error clipping raster with shapefile: {e}")
        return jsonify({'error': 'Failed to clip raster with shapefile'}), 500

    # Return the URL for the clipped file
    file_url = url_for('static', filename='clipped_result.tiff', _external=True)
    print(f"Returning file URL: {file_url}")
    
    return jsonify({'url': file_url})


if __name__ == '__main__':
    app.run(debug=True, port=8081, host="0.0.0.0" )


