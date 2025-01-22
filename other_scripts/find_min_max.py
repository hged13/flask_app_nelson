import os
import rasterio
import numpy as np

def find_global_min_max(directory):
    global_min = float('inf')
    global_max = float('-inf')

    # Loop through each file in the directory
    for filename in os.listdir(directory):
        if filename.endswith('.tif'):  # Assuming rasters are in .tif format
            filepath = os.path.join(directory, filename)

            with rasterio.open(filepath) as src:
                # Read the data from the first band
                data = src.read(1)  

                # Mask NaN values and -255 values
                data = data[~np.isnan(data)]  # Mask out NaNs
                data = data[data != -255]     # Mask out -255 values

                # Check if the data is not empty after filtering
                if data.size > 0:
                    raster_min = np.min(data)
                    raster_max = np.max(data)

                    # Update global min and max
                    if raster_min < global_min:
                        global_min = raster_min
                    if raster_max > global_max:
                        global_max = raster_max

                    print(f"Processed {filename}: Min={raster_min}, Max={raster_max}")
                else:
                    print(f"Processed {filename}: No valid data after filtering NaNs and -255.")

    # Check if valid global min and max were found
    if global_min == float('inf') or global_max == float('-inf'):
        print("No valid data found in the rasters.")
    else:
        print(f"Global Min: {global_min}")
        print(f"Global Max: {global_max}")




# Specify the directory containing your rasters
raster_directory = os.path.expanduser('~/Nelson_Model/geoserver/data_dir/coverages/Precipitation')
find_global_min_max(raster_directory)
