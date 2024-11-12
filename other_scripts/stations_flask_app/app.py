from flask import Flask, render_template, jsonify, request
import simplejson as json
import requests

app = Flask(__name__)

# Load the stations data from the JSON file
with open('stations_data.json', 'r') as f:
    stations_data = json.load(f)

# Clean the data to ensure it's JSON serializable
for station in stations_data['STATION']:
    station['LATITUDE'] = station.get('LATITUDE') or 0.0
    station['LONGITUDE'] = station.get('LONGITUDE') or 0.0
    station['NAME'] = station.get('NAME') or 'Unknown'
    station['STID'] = station.get('STID') or 'Unknown'

@app.route('/')
def map():
    return render_template('index.html', stations=stations_data['STATION'])

@app.route('/get_station_info', methods=['GET'])
def get_station_info():
    station_id = request.args.get('station_id')

     # Step 1: Query the station metadata
    metadata_url = 'http://api.mesowest.net/v2/stations/metadata'
    metadata_params = {
        'stid': station_id,
        'token': 'demotoken',  # Replace with your actual API token
    }
    metadata_response = requests.get(metadata_url, params=metadata_params)
    metadata_data = metadata_response.json()

    # Check if the metadata request was successful
    if 'STATION' not in metadata_data or len(metadata_data['STATION']) == 0:
        return jsonify({'error': 'Station metadata not found'}), 404
    
    station_info = metadata_data['STATION'][0]


    
        # Make an API call to get the most current RAWS reading
    baseURL = 'http://api.mesowest.net/v2/stations/latest'
    params = {
        'stid': station_id,
        'token': '186e20a975c94810a590f7c946282f42'  # Replace with your actual API token
    }
    r = requests.get(baseURL, params=params)
    data = r.json()

        # Extract relevant data
    latest_observations = data.get('STATION', [{}])[0].get('OBSERVATIONS', {})
    # Handle readings that may be lists or nested objects
    readings = {}
    for key, value in latest_observations.items():
        if isinstance(value, list):
            readings[key] = value[0]  # Take the first item in the list
        elif isinstance(value, dict):
            readings[key] = value.get('value', 'N/A')  # Extract 'value' if it's a dict
        else:
            readings[key] = value  # Use the value as-is if it's neither a list nor a dict



        # Return the current RAWS readings along with station info
    return jsonify({
        'name': station_info.get('NAME', 'N/A'),
        'elevation': station_info.get('ELEVATION', 'N/A'),
        'latitude': station_info.get('LATITUDE', 'N/A'),
        'longitude': station_info.get('LONGITUDE', 'N/A'),
        'status': station_info.get('STATUS', 'N/A'),
        'readings': readings # Most current RAWS readings
    })
 

if __name__ == '__main__':
    app.run(debug=True)
