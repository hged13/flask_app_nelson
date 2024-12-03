import requests
import rasterio
from rasterio.mask import mask
import geopandas as gpd


def test_get_coverage(coverage1, coverage2, time):
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
          <wcs:CoverageId>{coverage1}</wcs:CoverageId>
          <wcs:DimensionTrim>
            <wcs:Dimension>time</wcs:Dimension>
            <wcs:TrimLow>2021-04-12T00:00:00.000Z</wcs:TrimLow>
            <wcs:TrimHigh>2021-04-12T00:00:00.000Z</wcs:TrimHigh>
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
          <wcs:CoverageId>{coverage2}</wcs:CoverageId>
          <wcs:DimensionTrim>
            <wcs:Dimension>time</wcs:Dimension>
            <wcs:TrimLow>{time}</wcs:TrimLow>
            <wcs:TrimHigh>{time}</wcs:TrimHigh>
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





def send_wps_request():
    url = "http://localhost:8080/geoserver/ows"
    headers = {'Content-Type': 'text/xml'}

        
    coverage1 = 'Nelson__Precipitation'
    coverage2 = 'Nelson__1hr_outer'
    time = '2021-04-13T00:00:00.000Z'

    data = test_get_coverage(coverage1,coverage2,time)
    
    response = requests.post(url, headers=headers, data=data)
    
    if response.status_code != 200:
        print(f"WPS request failed with status code: {response.status_code}")
        return None
    
    print("WPS request succeeded")
    return response.content



def clip_raster_by_shapefile(raster_data, shapefile_path, output_path):
    # Read the shapefile
    shapefile = gpd.read_file(shapefile_path)
    
    # Ensure the shapefile and raster CRS match
    with rasterio.MemoryFile(raster_data) as memfile:
        with memfile.open() as src:
            if shapefile.crs.to_string() != src.crs.to_string():
                shapefile = shapefile.to_crs(src.crs)
            
            # Extract geometry from shapefile
            geometries = [feature["geometry"] for feature in shapefile.__geo_interface__["features"]]
            
            # Clip the raster
            clipped_image, clipped_transform = mask(src, geometries, crop=True, nodata=-255)
            
            # Save the clipped raster
            clipped_meta = src.meta.copy()
            clipped_meta.update({
                "driver": "GTiff",
                "height": clipped_image.shape[1],
                "width": clipped_image.shape[2],
                "transform": clipped_transform,
                "nodata": -255
            })
            
            with rasterio.open(output_path, "w", **clipped_meta) as dest:
                dest.write(clipped_image)
    
    print(f"Clipped raster saved to {output_path}")


response = send_wps_request()


if response:
  output_file = "test_result_add_test.tif"

  clip_raster_by_shapefile(response, "./Northern Rockies..shp", output_file)
   # output_file = "test_result_add_test.tif"
   # with open(output_file, "wb") as file:
      #  file.write(response)
   # print(f"Image saved to {output_file}")


