import requests
import pandas as pd

# Replace with your actual API token
api_token = '200~186e20a975c94810a590f7c946282f42'
url = "https://api.synopticdata.com/v2/stations"

params = {
    'token': api_token,
    'status': 'ACTIVE',  # Filter for active stations
    'country': 'US'       # Adjust the limit according to your needs and API restrictions
}

response = requests.get(url, params=params)

if response.status_code == 200:
    response_json = response.json()
    
    if 'STATION' in response_json:
        stations = response_json['STATION']
        
        # Create a DataFrame
        stations_df = pd.DataFrame(stations)
        
        # Print the DataFrame to verify
        print(stations_df[['STID', 'NAME', 'LATITUDE', 'LONGITUDE']])
        
        # Save to CSV for later use if needed
        stations_df.to_csv('stations.csv', index=False)
    else:
        print("The key 'STATION' is not in the response. Response JSON:")
        print(response_json)
else:
    print(f"Failed to retrieve data: {response}")

