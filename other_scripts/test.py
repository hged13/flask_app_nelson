import requests, simplejson

baseURL = 'http://api.mesowest.net/v2/'
queryParameters = 'stations/metadata?&network=2&status=active&token=186e20a975c94810a590f7c946282f42'

# Send the GET request to the MesoWest API
r = requests.get(baseURL + queryParameters)

# Parse the JSON response
r1 = simplejson.loads(r.content)

# Save the JSON data to a file
with open('stations_data.json', 'w') as json_file:
    simplejson.dump(r1, json_file, indent=4)

print("Station metadata has been saved to 'stations_data.json'")
