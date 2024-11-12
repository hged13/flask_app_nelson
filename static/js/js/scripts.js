        let mapCount = 1; // Tracks the number of maps
        const maps = {};  // Stores references to Leaflet map instances
        var currentXRange = null;
        console.log("IT WORK")


        // Initialize the default map with precipitation data
        function initializeMap(mapId, lat = 46.965260, lng = -109.533691, zoom = 6) {
            const map = L.map(mapId).setView([lat, lng], zoom);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 18,
            }).addTo(map);
            map.invalidateSize(); // Force Leaflet to recalculate the map size
            console.log(`Map initialized with ID: ${mapId}`);
            return map;
        }

        maps['map1'] = initializeMap('map1');
        if (maps['map1']) addLayer(maps['map1'], 'Precipitation', '2021-04-01T00:00:00.000Z'); // Default initial layer

        // Populate hours for the hour selector
        function populateHours(mapId) {
            const hourSelector = document.querySelector(`.map-hour-selector[data-map-id="${mapId}"]`);
            hourSelector.innerHTML = ''; // Clear previous options
            for (let i = 0; i < 24; i++) {
                const option = document.createElement('option');
                option.value = i.toString().padStart(2, '0');
                option.textContent = `${i.toString().padStart(2, '0')}:00`;
                hourSelector.appendChild(option);
            }
        }

           // Function to update the day selector dropdown
        // includes functionality to update month when needed.
        function updateLayerOneSelector() {
            var layerSelector= document.getElementById('FirstLayer');
            FirstLayer.innerHTML = '';
            
            var layer = document.createElement('option');
            layer.value = "Precipitation"
            layer.textContent = "Precipitation"
            layerSelector.appendChild(layer);

            var layer2 = document.createElement('option');
            layer2.value = "Mean_100hr"
            layer2.textContent = "Mean"
            layerSelector.appendChild(layer2);

            var layer3 = document.createElement('option');
            layer3.value = "Median_100hr"
            layer3.textContent = "Median"
            layerSelector.appendChild(layer3);

            var layer4 = document.createElement('option');
            layer4.value = "Outer_100hr"
            layer4.textContent = "Outer"
            layerSelector.appendChild(layer4);
            }

        function updateLayerTwoSelector() {
            var layerSelector= document.getElementById('SecondLayer');
            SecondLayer.innerHTML = '';
            
            var layer = document.createElement('option');
            layer.value = "Precipitation"
            layer.textContent = "Precipitation"
            layerSelector.appendChild(layer);

            var layer2 = document.createElement('option');
            layer2.value = "Mean_100hr"
            layer2.textContent = "Mean"
            layerSelector.appendChild(layer2);

            var layer3 = document.createElement('option');
            layer3.value = "Median_100hr"
            layer3.textContent = "Median"
            layerSelector.appendChild(layer3);

            var layer4 = document.createElement('option');
            layer4.value = "Outer_100hr"
            layer4.textContent = "Outer"
            layerSelector.appendChild(layer4);
            }


        // Function to dynamically add layers based on user selections
        function addLayer(map, layerType, date) {
            var layerName;

            // Check if the layer type is 'precipitation'
            if (layerType === 'Precipitation') {
                layerName = 'Nelson:Precipitation'; // No hour type for precipitation
            } 
            else if (layerType === 'ViirsData') {
            layerName = 'Nelson:Viirs_data_real'; // Set the correct name for your GeoServer image mosaic
            }
            else {
                // Construct layer name with hour type for other layers
                layerName = `Nelson:${layerType}_${document.querySelector(`.map-hour-type[data-map-id="${map._container.id}"]`).value}hr`;
            }

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 18,
            }).addTo(map);

            var wmsOptions = {
                format: 'image/png',
                transparent: true,
                version: '1.1.1',
                maxZoom: 100,
                time: date,
                attribution: "GeoServer"
            };

            var layer = L.tileLayer.wms("http://localhost:8080/geoserver/wms", {...wmsOptions, layers: layerName});
            layer.addTo(map);
            map.invalidateSize();
            updateLegend(map._container.id, layerName); // Update legend
        }

        // Function to update the legend image source based on the layer
        function updateLegend(mapId, layerName) {
            const legendImage = document.querySelector(`#legend-${mapId} .legend-image`);
            const legendUrl = `http://localhost:8080/geoserver/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&LAYER=${layerName}`;
            legendImage.src = legendUrl;
        }

        // Update the map layout based on the number of maps
        function updateLayout() {
            const container = document.getElementById('map-container');
            if (mapCount === 1) {
                container.className = 'one-map';
            } else if (mapCount === 2) {
                container.className = 'two-maps';
            } else if (mapCount === 3) {
                container.className = 'three-maps';
            } else if (mapCount === 4) {
                container.className = 'four-maps';
            }
            
            // Resize all maps when layout changes
            for (const mapId in maps) {
                maps[mapId].invalidateSize();
            }
        }

        // Add event listener to the "Add Map" button
        document.getElementById('add-map').addEventListener('click', () => {
            if (mapCount < 4) {
                mapCount++;
                const newMapDiv = document.createElement('div');
                newMapDiv.className = 'map-wrapper';
                newMapDiv.id = `map-wrapper-${mapCount}`; // Set a unique ID for the wrapper
                newMapDiv.innerHTML = `
                    <div class="map-controls" id="controls-map${mapCount}">
                        <select class="map-data-type" data-map-id="map${mapCount}">
                            <option value="Mean">Mean</option>
                            <option value="Median">Median</option>
                            <option value="Outer">Outer</option>
                            <option value="Precipitation">Precipitation</option>
                        </select>
                        <select class="map-hour-type" data-map-id="map${mapCount}">
                            <option value="1">1 Hour</option>
                            <option value="10">10 Hours</option>
                            <option value="100">100 Hours</option>
                        </select>
                        <input type="date" class="map-date-picker" data-map-id="map${mapCount}" min="2021-04-01" max="2021-09-30" value="2021-04-01">
                        <select class="map-hour-selector" data-map-id="map${mapCount}">
                            <!-- Hours will be populated dynamically -->
                        </select>
                        <button class="prev-hour" data-map-id="map${mapCount}">Previous Hour</button>
                        <button class="next-hour" data-map-id="map${mapCount}">Next Hour</button>
                        <button class="update-map" data-map-id="map${mapCount}">Update Map</button>
                        <button class="delete-map" data-map-id="map${mapCount}">Delete Map</button> <!-- Add delete button -->
                    </div>
                    <div id="map${mapCount}" class="map"></div>
                    <div class="map-legend" id="legend-map${mapCount}">
                        <p>Legend</p>
                        <img src="" alt="Legend for map${mapCount}" class="legend-image">
                    </div>
                `;
                document.getElementById('map-container').appendChild(newMapDiv);

                maps[`map${mapCount}`] = initializeMap(`map${mapCount}`);
                if (maps[`map${mapCount}`]) {
                    const date = document.getElementById('date-picker').value ? `${document.getElementById('date-picker').value}T00:00:00.000Z` : '2021-04-01T00:00:00.000Z';
                    const layertype = document.getElementById('data-type').value;

                    addLayer(maps[`map${mapCount}`], layertype, date); // Initial layer for new map
                    maps[`map${mapCount}`].invalidateSize(); // Force Leaflet to recalculate the size
                    populateHours(`map${mapCount}`);
                }

                updateLayout(); // Update the layout for new map count
            } else {
                console.log('Maximum of 4 maps reached.');
            }
        });

        // Event listener for individual map controls to update the specific map
        document.addEventListener('click', function(event) {
            if (event.target.classList.contains('update-map')) {
                const mapId = event.target.getAttribute('data-map-id');
                const dataType = document.querySelector(`.map-data-type[data-map-id="${mapId}"]`).value;
                const hourType = document.querySelector(`.map-hour-type[data-map-id="${mapId}"]`).value;
                const hour = document.querySelector(`.map-hour-selector[data-map-id="${mapId}"]`).value;

                // Retrieve the selected date from the date picker
                const selectedDay = document.querySelector(`.map-date-picker[data-map-id="${mapId}"]`).value;
                const dateTime = `${selectedDay}T${hour}:00:00.000Z`;

                // Get the date value from the map's date picker
                const date = document.querySelector(`.map-date-picker[data-map-id="${mapId}"]`).value 
                ? `${document.querySelector(`.map-date-picker[data-map-id="${mapId}"]`).value}T${hour}:00:00.000Z` // Incorporate the hour into the date string
                : '2021-04-01T00:00:00.000Z';

                // Clear existing layers and add the new layer
                maps[mapId].eachLayer(layer => maps[mapId].removeLayer(layer));
                addLayer(maps[mapId], dataType, dateTime);
                maps[mapId].invalidateSize(); // Force Leaflet to recalculate the size
                console.log(`Updated ${mapId} with ${dataType} for ${hourType} hours and date ${date}`);
            }

            // Handle delete map action
            if (event.target.classList.contains('delete-map')) {
                const mapId = event.target.getAttribute('data-map-id');
                removeMap(mapId); // Call the removeMap function
            }
        });

        function GetTimeValue(layerName) {
            // Determine the map ID from the layer name if needed
            // Example assumes layerName corresponds directly to a map ID, adjust if necessary
            const mapId = layerName; // If layerName and mapId are directly correlated

            // Select the date picker and hour selector for the specific map ID
            const dateElement = document.querySelector(`.map-date-picker[data-map-id="${mapId}"]`).value;
            const hourElement = document.querySelector(`.map-hour-selector[data-map-id="${mapId}"]`).value;
            console.log(dateElement);
            console.log(hourElement);

        
            // Construct the date-time string in the desired format
            const dateTime = `${dateElement}T${hourElement}:00:00.000Z`;

            return dateTime;
        }


        // Function to remove a map
        function removeMap(mapId) {
            // Remove the map from the maps object and remove the map element
            if (maps[mapId]) {
                maps[mapId].remove(); // Removes the Leaflet map instance
                delete maps[mapId];   // Deletes the map reference from the object
                document.getElementById(`map-wrapper-${mapId.slice(-1)}`).remove(); // Removes the HTML element
                mapCount--;           // Decrement the map count
                updateLayout();       // Adjust the layout
                console.log(`Removed map with ID: ${mapId}`);
            }
        }

        // Function to adjust hour selection based on the buttons
        function adjustHour(mapId, direction) {
            const hourSelector = document.querySelector(`.map-hour-selector[data-map-id="${mapId}"]`);
            let selectedIndex = hourSelector.selectedIndex;
            if (direction === 'next') {
                if (selectedIndex < hourSelector.options.length - 1) {
                    hourSelector.selectedIndex += 1;
                } else {
                    // Move to the next day if it's the last hour of the day
                    hourSelector.selectedIndex = 0;
                    const datePicker = document.querySelector(`.map-date-picker[data-map-id="${mapId}"]`);
                    const newDate = new Date(datePicker.value);
                    newDate.setDate(newDate.getDate() + 1);
                    if (newDate <= new Date(datePicker.max)) {
                        datePicker.value = newDate.toISOString().split('T')[0];
                    }
                }
            } else {
                if (selectedIndex > 0) {
                    hourSelector.selectedIndex -= 1;
                } else {
                    // Move to the previous day if it's the first hour of the day
                    hourSelector.selectedIndex = 23;
                    const datePicker = document.querySelector(`.map-date-picker[data-map-id="${mapId}"]`);
                    const newDate = new Date(datePicker.value);
                    newDate.setDate(newDate.getDate() - 1);
                    if (newDate >= new Date(datePicker.min)) {
                        datePicker.value = newDate.toISOString().split('T')[0];
                    }
                }
            }
        }

        // Add listeners for the previous and next hour buttons
        document.addEventListener('click', function(event) {
            const mapId = event.target.getAttribute('data-map-id');
            if (event.target.classList.contains('prev-hour')) {
                adjustHour(mapId, 'prev');
            } else if (event.target.classList.contains('next-hour')) {
                adjustHour(mapId, 'next');
            }
        });

        // Sync dates across all maps when the "Sync Dates" button is clicked
        document.getElementById('sync-dates').addEventListener('click', () => {
            const globalDate = document.getElementById('date-picker').value;
            const globalHour = '00'; // Default to the start of the day for simplicity

            for (const mapId in maps) {
                // Update each map's date picker and hour selector
                const datePicker = document.querySelector(`.map-date-picker[data-map-id="${mapId}"]`);
                const hourSelector = document.querySelector(`.map-hour-selector[data-map-id="${mapId}"]`);

                datePicker.value = globalDate;
                hourSelector.value = globalHour;

                // Retain the existing layer type for each map
                const dataType = document.querySelector(`.map-data-type[data-map-id="${mapId}"]`).value;

                // Construct the date-time string for the layer update
                const dateTime = `${globalDate}T${globalHour}:00:00.000Z`;

                // Clear existing layers and add the new layer with synced date and retained layer type
                maps[mapId].eachLayer(layer => maps[mapId].removeLayer(layer));
                addLayer(maps[mapId], dataType, dateTime);
                maps[mapId].invalidateSize(); // Force Leaflet to recalculate the size
            }
            console.log(`Synced all maps to date: ${globalDate}`);
        });

        //helper function to facilitate raster algebra. 'FirstLayer'
        function GetLayer(layerorder, mapname){
            var firstlayer = document.getElementById(layerorder).value;
            var timevalue = GetTimeValue(mapname);
            var index = dateToHourIndex(timevalue);
            console.log(index);// Output: 2
            var granulestring = `Nelson__${firstlayer}_granule_${firstlayer}.${index}`;
            console.log(granulestring);
            return granulestring;
            }

            function dateToHourIndex(dateString) {
                console.log(dateString)
        // Define the starting date
            const startDate1 = new Date(Date.UTC(2021, 3, 1, 0, 0, 0));
            console.log(startDate1)


            const startDate = '2021-04-01T00:00:00.000Z';
            const startYear = 2021;
            const startMonth = 4;
            const startDay = 1;
            const startHour =0;
            

    
            // Extract the date and time components from the input date string
            const year = parseInt(dateString.substring(0, 4), 10);
            console.log(year) // Output: 2

            const month = parseInt(dateString.substring(5, 7), 10);
            console.log(month) // Output: 2
            // Months are 0-indexed in JavaScript
            const day = parseInt(dateString.substring(8, 10), 10);
            console.log(day) // Output: 2

            const hour = parseInt(dateString.substring(12, 13), 10);
            console.log(hour) // Output: 2

            const inputDate = new Date(Date.UTC(year, (month-1), day, hour, 0, 0));

            // Calculate the difference in milliseconds
            const diffMs = inputDate - startDate1;
            console.log(diffMs)
    
    // Convert the difference from milliseconds to hours
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            console.log(inputDate)
            
            console.log(diffHours)
    
    // Return the hour index (starting from 1)
            return diffHours + 1;


    
           ;
        }

        function  loadGeoTIFF(url) {
    if (mapCount < 4) {
        mapCount++;
        const newMapDiv = document.createElement('div');
        newMapDiv.className = 'map-wrapper';
        newMapDiv.id = `map-wrapper-${mapCount}`; // Set a unique ID for the wrapper
        newMapDiv.innerHTML = `
            <div class="map-controls" id="controls-map${mapCount}">
                <button class="delete-map" data-map-id="map${mapCount}">Delete Map</button> <!-- Only delete button -->
            </div>
            <div id="map${mapCount}" class="map"></div>
            <div class="map-legend" id="legend-map${mapCount}">
                <p>Legend</p>
                <img src="" alt="Legend for map${mapCount}" class="legend-image">
            </div>
        `;
        document.getElementById('map-container').appendChild(newMapDiv);

        // Initialize the new map
        maps[`map${mapCount}`] = initializeMap(`map${mapCount}`);
        if (maps[`map${mapCount}`]) {
            // Fetch and parse the GeoTIFF data
            fetch(url)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => {
                    // Parse the GeoTIFF data
                    parseGeoraster(arrayBuffer).then(georaster => {
                        console.log("georaster:", georaster);

                        // Create a GeoRasterLayer with the parsed GeoTIFF data
                        var layer = new GeoRasterLayer({
                            georaster: georaster,
                            opacity: 0.7,
                            resolution: 64 // Optional parameter for adjusting display resolution
                        });

                        // Add the GeoRasterLayer to the map
                        layer.addTo(maps[`map${mapCount}`]);
                        maps[`map${mapCount}`].invalidateSize(); // Force Leaflet to recalculate the size
                    });
                })
                .catch(error => console.error('Error:', error));
        }

        updateLayout(); // Update the layout for the new map count
    } else {
        console.log('Maximum of 4 maps reached.');
    }
}

        // Sync dates across all maps when the "Sync Dates" button is clicked
        document.getElementById('generateRaster').addEventListener('click', () => {
           if(mapCount<4){
            console.log("Count is right")
            var coverage1= GetLayer('FirstLayer', 'map0')
            var coverage2= GetLayer('SecondLayer', 'mapp')
            fetch(`/process_raster?coverage1=${coverage1}&coverage2=${coverage2}`, {
                method: 'POST',
            })
            .then(response => response.json())
            .then(data => {
                if (data.url) {
                    console.log('Received URL:', data.url);


                    loadGeoTIFF(data.url);
                } else {
                    console.error('Error: GeoTIFF URL not found.');
                }
            })
            .catch(error => console.error('Error:', error));

           }
        });

        // Populate hours for the initial map
        populateHours('map1');
        populateHours('map0');
        populateHours('mapp');
        updateLayerOneSelector();
        updateLayerTwoSelector();


        // Assuming maps is an object with map instances, iterate over each map
Object.keys(maps).forEach(mapId => {
    const map = maps[mapId];
    console.log(mapId)

    // Event listener for map clicks to fetch data and display plots
    map.on('click', function(e) {
        var lat = e.latlng.lat;
        var lng = e.latlng.lng;
        var time = GetTimeValue(mapId); // Update this function call based on your requirement

        // Store the current x-range
        var plotDiv = document.getElementById('plot');
        if (plotDiv && plotDiv.layout && plotDiv.layout.xaxis && plotDiv.layout.xaxis.range) {
            currentXRange = plotDiv.layout.xaxis.range;
        }

        // Fetch all data
        fetch(`/get_all_data?lat=${lat}&lng=${lng}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error('Error:', data.error);
                    return;
                }
                document.getElementById('plot-container').style.display = 'block';

                // Process and plot Precipitation data
                var precip_times = data.precipitation.times;
                var precip_values = data.precipitation.values;
                var precipData = {
                    x: precip_times,
                    y: precip_values,
                    type: 'scatter',
                    mode: 'markers',
                    marker: { color: 'blue' },
                    name: 'Precipitation'
                };

                // Process and plot Outer data
                var outer_times = data.outer.times;
                var outer_values = data.outer.values;
                var outerData = {
                    x: outer_times,
                    y: outer_values,
                    type: 'scatter',
                    mode: 'markers',
                    marker: { color: 'red' },
                    name: 'Outer'
                };

                // Process and plot Mean data
                var mean_times = data.mean.times;
                var mean_values = data.mean.values;
                var meanData = {
                    x: mean_times,
                    y: mean_values,
                    type: 'scatter',
                    mode: 'markers',
                    marker: { color: 'green' },
                    name: 'Mean'
                };

                // Process and plot Median data
                var median_times = data.median.times;
                var median_values = data.median.values;
                var medianData = {
                    x: median_times,
                    y: median_values,
                    type: 'scatter',
                    mode: 'markers',
                    marker: { color: 'purple' },
                    name: 'Median'
                };

                // Combine all traces
                var timeseriesData = [precipData, outerData, meanData, medianData];

                // Calculate the global maximum y-value
                globalMaxY = Math.max(
                    ...precip_values,
                    ...outer_values,
                    ...mean_values,
                    ...median_values
                );

                // Plotly for data visualization
                Plotly.newPlot('plot', timeseriesData, {
                    title: 'Timeseries Data',
                    xaxis: {
                        title: 'Time',
                        rangeslider: {},
                        type: 'date',
                        range: currentXRange // Apply the stored x-range
                    },
                    yaxis: { title: 'Value' },
                });
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
    });
});

// Helper function to format timestamp
function formatTimestamp(time) {
    let year = time.slice(0, 4);
    let month = time.slice(4, 6);
    let day = time.slice(6, 8);
    let hour = time.slice(8, 10);
    return `${year}-${month}-${day}T${hour}:00:00`;
}

// Function to adjust the y-axis based on the current x-range
document.getElementById('adjust-y-axis').addEventListener('click', function() {
    var plotDiv = document.getElementById('plot');
    var xRange = plotDiv.layout.xaxis.range;

    var filteredData = plotDiv.data.map(trace => {
        return trace.y.filter((value, index) => {
            var xValue = new Date(trace.x[index]).getTime();
            return xValue >= new Date(xRange[0]).getTime() && xValue <= new Date(xRange[1]).getTime();
        });
    });

    var maxY = Math.max(...filteredData.map(arr => Math.max(...arr)));

    Plotly.relayout('plot', {
        'yaxis.range': [0, maxY]
    });
});

// Function to reset the y-axis to the global maximum y-value
document.getElementById('reset-y-axis').addEventListener('click', function() {
    Plotly.relayout('plot', {
        'yaxis.range': [0, globalMaxY]
    });
});

    // Function to reset the y-axis to the global maximum y-value
document.getElementById('close-button').addEventListener('click', function() {
            console.log("close!!!!")
            document.getElementById('plot-container').style.display = 'none';

    });


    // Track VIIRS layers added to each map
const viirsLayers = {};

// Function to add or remove the VIIRS overlay
function toggleVIIRSOverlay(mapId) {
    const map = maps[mapId];

    if (viirsLayers[mapId]) {
        // Remove the VIIRS layer if it already exists
        map.removeLayer(viirsLayers[mapId]);
        delete viirsLayers[mapId];
        console.log(`VIIRS overlay removed from ${mapId}`);
    } else {


        const mapId = event.target.getAttribute('data-map-id');
                const dataType = document.querySelector(`.map-data-type[data-map-id="${mapId}"]`).value;
                const hourType = document.querySelector(`.map-hour-type[data-map-id="${mapId}"]`).value;
                const hour = document.querySelector(`.map-hour-selector[data-map-id="${mapId}"]`).value;

                // Retrieve the selected date from the date picker
                const selectedDay = document.querySelector(`.map-date-picker[data-map-id="${mapId}"]`).value;
                const dateTime = `${selectedDay}T${hour}:00:00.000Z`;

                // Get the date value from the map's date picker
                const date = document.querySelector(`.map-date-picker[data-map-id="${mapId}"]`).value 
                ? `${document.querySelector(`.map-date-picker[data-map-id="${mapId}"]`).value}T${hour}:00:00.000Z` // Incorporate the hour into the date string
                : '2021-04-01T00:00:00.000Z';

        // Add the VIIRS overlay
        const viirsLayer = L.tileLayer.wms("http://localhost:8080/geoserver/wms", {
            layers: 'Nelson:Viirs_data_real', // Replace with the correct layer name from GeoServer
            format: 'image/png',
            transparent: true,
            version: '1.1.1',
            maxZoom: 18,
            time: dateTime,
            attribution: "GeoServer VIIRS Data"
        });

        viirsLayer.addTo(map);
        viirsLayers[mapId] = viirsLayer;
        console.log(`VIIRS overlay added to ${mapId}`);
    }

    map.invalidateSize(); // Refresh the map size and display
}

// Add event listeners for the Toggle VIIRS Overlay button
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('toggle-viirs-overlay')) {
        const mapId = event.target.getAttribute('data-map-id');
        toggleVIIRSOverlay(mapId);
    }
});
         

