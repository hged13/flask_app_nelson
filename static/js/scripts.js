// ===================================
// Initialization/Set up Steps
// ===================================

let mapCount = 1; // Tracks the number of maps 
const maps = {};  // Stores references to Leaflet map instances
var currentXRange = null; // To be used with the popup scatterplot

// Track VIIRS and MODIS layers added to each map
const viirsLayers = {};
const modisLayers = {};

// Initialize first map
maps['map1'] = initializeMap('map1');
if (maps['map1']) addLayer(maps['map1'], 'Precipitation', '2021-04-01T01:00:00.000Z'); // Default initial layer

//Populate hours for the initial map
populateHours('map1');
populateHours('map0');
populateHours('mapp');
updateLayerSelector('FirstLayer', FirstLayer);
updateLayerSelector('SecondLayer', SecondLayer);
populateHours('map');



//===================================
// Map Management Functions
//===================================

// Function to initialize the default map 
function initializeMap(mapId, lat = 46.965260, lng = -109.533691, zoom = 6) {
    const map = L.map(mapId).setView([lat, lng], zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
    }).addTo(map);
    map.invalidateSize(); // Force Leaflet to recalculate the map size
    return map;
}


// Function to dynamically add layers based on user selections
async function addLayer(map, layerType, date) {
    var min=0;
    var max=1;
    var layerName;
    var index = dateToHourIndex(date);

    if (layerType === 'Precipitation') {
        layerName = 'Nelson:Precipitation2'; // No hour type for precipitation

        try {
            // Fetch metadata and wait for the response
            const response = await fetch(`/get_metadata?time=${index}`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            // Parse the JSON response
            const data = await response.json();

            // Extract max from the response
            if (data.max!=0){
            max = data.max;}
            else{
                console.log("bummer")
            }
            

            // Log min and max for debugging
            console.log(`Time Index: ${index}, Min: ${min}, Max: ${max}`);
        } catch (error) {
            console.error('Error fetching metadata:', error);
        }
    } 
    else if (layerType === 'ViirsData') {
    layerName = 'Nelson:VIIRS_FRP'; // Set the correct name for the GeoServer image mosaic
    }
    else {
        // Construct layer name with hour type for other layers
        layerName = `Nelson:${document.querySelector(`.map-hour-type[data-map-id="${map._container.id}"]`).value}hr_${layerType}`;
    }
    console.log(max)
    var wmsOptions = {
        format: 'image/png',
        transparent: true,
        version: '1.1.1',
        maxZoom: 100,
        time: date,
        attribution: "GeoServer",
        COLORSCALERANGE: `${min},${max}`
    };
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18,}).addTo(map);
    var layer = L.tileLayer.wms("http://greynathan-Precision-7920-Tower:8080/geoserver/wms", {...wmsOptions, layers: layerName});
    layer.addTo(map);
    map.invalidateSize();
    updateLegend(map._container.id, layerName, min, max, layerType); // Update legend
}



// Combined function to add or remove a layer (VIIRS or MODIS overlay)
function toggleOverlay(mapId, layerType) {
    const map = maps[mapId];
    const layers = layerType === 'VIIRS' ? viirsLayers : modisLayers;
    const layerName = layerType === 'VIIRS' ? 'Nelson:VIIRS_FRP' : 'Nelson:MODIS_FRP';

    if (layers[mapId]) {
        // Remove the layer if it already exists
        map.removeLayer(layers[mapId]);
        delete layers[mapId];
    } else {
        const mapId = event.target.getAttribute('data-map-id');
        const dataType = document.querySelector(`.map-data-type[data-map-id="${mapId}"]`).value;
        const hourType = document.querySelector(`.map-hour-type[data-map-id="${mapId}"]`).value;
        const hour = document.querySelector(`.map-hour-selector[data-map-id="${mapId}"]`).value;

        // Retrieve the selected date from the date picker
        const selectedDay = document.querySelector(`.map-date-picker[data-map-id="${mapId}"]`).value;
        const dateTime = `${selectedDay}T${hour}:00:00.000Z`;

        // Add the overlay
        const overlayLayer = L.tileLayer.wms("http://greynathan-Precision-7920-Tower:8080/geoserver/wms", {
            layers: layerName, // Use the correct layer name based on the type
            format: 'image/png',
            transparent: true,
            version: '1.1.1',
            maxZoom: 18,
            time: dateTime,
            attribution: `GeoServer ${layerType} Data`
        });

        overlayLayer.addTo(map);
        layers[mapId] = overlayLayer;
    }

    map.invalidateSize(); // Refresh the map size and display
}



// Function to update the legend image source based on the layer
function updateLegend(mapId, layerName, min, max, layerType) {
    var legendUrl;
    if (layerType=="Precipitation"){
       legendUrl = `http://greynathan-Precision-7920-Tower:8080/geoserver/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&LAYER=${layerName}&COLORSCALERANGE=${min},${max}&WIDTH=20&HEIGHT=5&LEGEND_OPTIONS=forceLabels:on`;

    }
    else{

        legendUrl = `http://greynathan-Precision-7920-Tower:8080/geoserver/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&LAYER=${layerName}`;
    }
    const legendImage = document.querySelector(`#legend-${mapId} .legend-image`);
    // Select the legend container
    const legendContainer = legendImage.parentElement;

    // Remove existing labels if they exist
    const existingMinLabel = legendContainer.querySelector('.legend-min');
    const existingMaxLabel = legendContainer.querySelector('.legend-max');
    if (existingMinLabel) existingMinLabel.remove();
    if (existingMaxLabel) existingMaxLabel.remove();
    
    legendImage.src = legendUrl;
    if (layerType === "Precipitation") {
        // Limit max to 3 decimal places
        const maxRounded = parseFloat(max).toFixed(3);

        // Create new "Min" and "Max" labels
        const minLabel = document.createElement('span');
        minLabel.textContent = `${min} mm`;
        minLabel.classList.add('legend-min');
        minLabel.style.display = 'block'; // Ensures the text appears above the image
        minLabel.style.textAlign = 'center';
    
        const maxLabel = document.createElement('span');
        maxLabel.textContent = `${maxRounded} mm`;
        maxLabel.classList.add('legend-max');
        maxLabel.style.display = 'block'; // Ensures the text appears below the image
        maxLabel.style.textAlign = 'center';
    
        // Insert the labels around the image
        legendContainer.insertBefore(minLabel, legendImage); // Add "Min" above the image
        legendContainer.appendChild(maxLabel);              // Add "Max" below the image
    }
    
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


// Function to retrieve time value for use with getting layers
//
function GetTimeValue(layerName) {
    // Determine the map ID from the layer name if needed
    // Example assumes layerName corresponds directly to a map ID, adjust if necessary
    const mapId = layerName; // If layerName and mapId are directly correlated

    // Select the date picker and hour selector for the specific map ID
    const dateElement = document.querySelector(`.map-date-picker[data-map-id="${mapId}"]`).value;
    const hourElement = document.querySelector(`.map-hour-selector[data-map-id="${mapId}"]`).value;


    // Construct the date-time string in the desired format
    const dateTime = `${dateElement}T${hourElement}:00:00.000Z`;

    return dateTime;
}


//helper function to facilitate raster algebra. 'FirstLayer'
function GetLayer(layerorder, mapname){
    var firstlayer = document.getElementById(layerorder).value;
    var timevalue = GetTimeValue(mapname);
    var index = dateToHourIndex(timevalue);
    var granulestring = `Nelson__${firstlayer}`;
    return granulestring;
    }


function dateToHourIndex(dateString) {
    // Define the starting date (April 1, 2021, 00:00:00 UTC)
    const startDate = new Date(Date.UTC(2021, 3, 1, 0, 0, 0)); // Note: Month is 0-based

    // Parse the input date string
    const year = parseInt(dateString.substring(0, 4), 10);
    const month = parseInt(dateString.substring(5, 7), 10); // 1-based month
    const day = parseInt(dateString.substring(8, 10), 10);
    const hour = parseInt(dateString.substring(11, 13), 10); // Corrected substring for hours

    // Create a Date object for the input date
    const inputDate = new Date(Date.UTC(year, month - 1, day, hour, 0, 0)); // Month is 0-based

    // Calculate the difference in milliseconds
    const diffMs = inputDate - startDate;

    // Convert the difference from milliseconds to hours
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    // Return the hour index
    return diffHours;
}



function loadGeoTIFF(url) {
    if (mapCount >= 4) return; 

    mapCount++;

    const newMapDiv = document.createElement('div');
    newMapDiv.className = 'map-wrapper';
    newMapDiv.id = `map-wrapper-${mapCount}`;
    newMapDiv.innerHTML = `
        <div class="map-controls" id="controls-map${mapCount}">
            <button class="delete-map" data-map-id="map${mapCount}">Delete Map</button>
        </div>
        <div id="map${mapCount}" class="map"></div>
        <div class="map-legend" id="legend-map${mapCount}">
            <p>Legend</p>
        </div>
    `;

    document.getElementById('map-container').appendChild(newMapDiv);

    maps[`map${mapCount}`] = initializeMap(`map${mapCount}`);

    if (maps[`map${mapCount}`]) {
        fetch(url)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => parseGeoraster(arrayBuffer))
            .then(georaster => {
                const max = georaster.maxs[0];
                const min = georaster.mins[0];
                const noDataValue = georaster.noDataValue;

                  // Create a color scale using chroma.js
                const layer = new GeoRasterLayer({
                    georaster,
                    opacity: 0.7,
                    resolution: 64
                   
                });
                layer.addTo(maps[`map${mapCount}`]);
                maps[`map${mapCount}`].invalidateSize();
                            /// Create a grayscale legend dynamically
                const legend = document.createElement('div');
                legend.className = 'legend';
                legend.innerHTML = `
                    <div class="label">
                        <span>${max.toFixed(2)}</span>
                    </div>
                    <div class="gradient" style="background: linear-gradient(to bottom, black, white); height:150px; width:20%;"></div>
                    <div class="label2">
                        <span>${min.toFixed(2)}</span>
                    </div>
                `;
                document.querySelector(`#legend-map${mapCount}`).appendChild(legend);
            })
            .catch(error => console.error('Error:', error));
    }

    updateLayout();
}

        
// Sync dates across all maps when the "Sync Dates" button is clicked
document.getElementById('generateRaster').addEventListener('click', () => {
    if(mapCount<4){
    var coverage1= GetLayer('FirstLayer', 'map0')
    var coverage2= GetLayer('SecondLayer', 'mapp')
    var time1 = GetTimeValue('map0');
    var time2 = GetTimeValue('mapp')
    console.log(time1);
    console.log(time2)


    fetch(`/process_raster?coverage1=${coverage1}&coverage2=${coverage2}&time1=${time1}&time2=${time2}`, {
        method: 'POST',
    })
    .then(response => response.json())
    .then(data => {
        if (data.url) {


            loadGeoTIFF(data.url);
        } else {
            console.error('Error: GeoTIFF URL not found.');
        }
    })
    .catch(error => console.error('Error:', error));

    }
});
        
                


//===================================
// Buttons, Drop Downs ETC 
//===================================

        
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
function updateLayerSelector(getlayer, whichlayer) {
    var layerSelector= document.getElementById(getlayer);

    whichlayer.innerHTML = '';
    
    var layer = document.createElement('option');
    layer.value = "Precipitation"
    layer.textContent = "Precipitation"
    layerSelector.appendChild(layer);

    var layer2 = document.createElement('option');
    layer2.value = "100hr_mean"
    layer2.textContent = "100hr mean"
    layerSelector.appendChild(layer2);

    var layer3 = document.createElement('option');
    layer3.value = "100hr_median"
    layer3.textContent = "100hr median"
    layerSelector.appendChild(layer3);

    var layer4 = document.createElement('option');
    layer4.value = "100hr_outer"
    layer4.textContent = "100hr Outer"
    layerSelector.appendChild(layer4);

    var layer2 = document.createElement('option');
    layer2.value = "10hr_mean"
    layer2.textContent = "10hr mean"
    layerSelector.appendChild(layer2);

    var layer3 = document.createElement('option');
    layer3.value = "10hr_median"
    layer3.textContent = "10hr median"
    layerSelector.appendChild(layer3);

    var layer4 = document.createElement('option');
    layer4.value = "10hr_outer"
    layer4.textContent = "10hr Outer"
    layerSelector.appendChild(layer4);

    var layer2 = document.createElement('option');
    layer2.value = "1hr_mean"
    layer2.textContent = "1hr mean"
    layerSelector.appendChild(layer2);

    var layer3 = document.createElement('option');
    layer3.value = "1hr_median"
    layer3.textContent = "1hr median"
    layerSelector.appendChild(layer3);

    var layer4 = document.createElement('option');
    layer4.value = "1hr_outer"
    layer4.textContent = "1hr Outer"
    layerSelector.appendChild(layer4);
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





//===================================
// EVENT LISTENTER FUNCTIONS 
//  (besides scatterplot)
//===================================




// THIS defines what happens when the add map button is clicked
document.getElementById('add-map').addEventListener('click', () => {
    if (mapCount < 4) {
        mapCount++;
        
        // Clone the template content
        const template = document.getElementById('map-template');
        const newMapDiv = template.content.cloneNode(true);

        // Set unique IDs and data attributes
        const mapWrapper = newMapDiv.querySelector('.map-wrapper');
        mapWrapper.id = `map-wrapper-${mapCount}`;
        
        const mapControls = newMapDiv.querySelector('.map-controls');
        mapControls.id = `controls-map${mapCount}`;
        
        // Update data-map-id for all relevant elements within the template
        mapControls.querySelectorAll('[data-map-id]').forEach(element => {
            element.setAttribute('data-map-id', `map${mapCount}`);
        });

            // **SYNC VALUES** with global controls
        mapControls.querySelector('.map-data-type').value = document.getElementById('data-type').value;
        mapControls.querySelector('.map-hour-type').value = document.getElementById('hour-type').value;
        mapControls.querySelector('.map-date-picker').value = document.getElementById('date-picker').value;
        const globalHour = document.querySelector(`.map-hour-selector[data-map-id="map"]`).value;

        mapControls.querySelector(`.map-hour-selector[data-map-id="map${mapCount}"]`).value = document.querySelector(`.map-hour-selector[data-map-id="map"]`).value;
        // Set unique ID for the map and legend
        const map = newMapDiv.querySelector('.map');
        map.id = `map${mapCount}`;
    
        const legend = newMapDiv.querySelector('.map-legend');
        legend.id = `legend-map${mapCount}`;
        legend.querySelector('img').setAttribute('alt', `Legend for map${mapCount}`);

        // Append the cloned content to the map container
        document.getElementById('map-container').appendChild(newMapDiv);

        // Initialize the new map with default settings
        maps[`map${mapCount}`] = initializeMap(`map${mapCount}`);
        if (maps[`map${mapCount}`]) {
              // Get the date value from the map
            const date = document.getElementById('date-picker').value ? `${document.getElementById('date-picker').value}T${globalHour}:00:00.000Z` : '2021-04-01T00:00:00.000Z';
            const layerType = document.getElementById('data-type').value;
            addLayer(maps[`map${mapCount}`], layerType, date);
            maps[`map${mapCount}`].invalidateSize(); // Force Leaflet to recalculate the size
            populateHours(`map${mapCount}`);
        }
        const mapId = map.id;
        const dataType = document.querySelector(`.map-data-type[data-map-id="${mapId}"]`).value;
        const hourSelector = document.querySelector(`.map-hour-selector[data-map-id="${mapId}"]`);
        hourSelector.value = globalHour;
        console.log(mapId);
        updateLayout(); // Update layout to accommodate the new map
    } else {
        console.log('Maximum of 4 maps reached.');
    }
});
        

// THIS defines what happens when any update-map button is clicked 
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

        console.log(`Date: ${date}`)
        console.log(dateTime)

        // Clear existing layers and add the new layer
        maps[mapId].eachLayer(layer => maps[mapId].removeLayer(layer));
        addLayer(maps[mapId], dataType, dateTime);
        maps[mapId].invalidateSize(); // Force Leaflet to recalculate the size
    }

    // Handle delete map action
    if (event.target.classList.contains('delete-map')) {
        const mapId = event.target.getAttribute('data-map-id');
        removeMap(mapId); // Call the removeMap function
    }});

        
// Add listeners for the previous and next hour buttons
document.addEventListener('click', function(event) {
    const mapId = event.target.getAttribute('data-map-id');
    if (event.target.classList.contains('prev-hour')) {
        adjustHour(mapId, 'prev');
    } else if (event.target.classList.contains('next-hour')) {
        adjustHour(mapId, 'next');
    }});

// Sync dates across all maps when the "Sync Dates" button is clicked
document.getElementById('sync-dates').addEventListener('click', () => {
    const globalDate = document.getElementById('date-picker').value;
    const globalHour = document.querySelector(`.map-hour-selector[data-map-id="map"]`).value;


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
    }});


// Add event listeners for the Toggle VIIRS Overlay button
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('viirs-overlay')) {
        const mapId = event.target.getAttribute('data-map-id');
        toggleOverlay(mapId, 'VIIRS');}})

// Add event listeners for the Toggle VIIRS Overlay button
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modis-overlay')) {
        const mapId = event.target.getAttribute('data-map-id');
        toggleOverlay(mapId, 'MODIS');
    }})

// Add event listeners for the Toggle VIIRS Overlay button
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('toggle-viirs-overlay')) {
        const mapId = event.target.getAttribute('data-map-id');
        toggleOverlay(mapId, 'VIIRS');}} )

// Add event listeners for the Toggle VIIRS Overlay button
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('toggle-modis-overlay')) {
        const mapId = event.target.getAttribute('data-map-id');
        toggleOverlay(mapId, 'MODIS');
    }});

        
//===================================
// ScatterPlot Functionality
//===================================

function setScatterplot(type,lat,lng,time) {
const hour = type;
console.log(type);

    // Store the current x-range
var plotDiv = document.getElementById('plot');
if (plotDiv && plotDiv.layout && plotDiv.layout.xaxis && plotDiv.layout.xaxis.range) {
    currentXRange = plotDiv.layout.xaxis.range;
}

// Fetch all data
fetch(`/get_all_data?lat=${lat}&lng=${lng}&hour=${hour}`)
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
            name: 'Precipitation',
            yaxis: 'y2'
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
        var timeseriesData = [ outerData, meanData, medianData, precipData]; //precipData (add this if want precip included)

        // Calculate the global maximum y-value
        globalMaxY = Math.max(

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
            yaxis: { title: 'Value'},
            yaxis2:{
                Title:'Precipitation',
                overlaying:'y',
                side:'right'}
        });
    })
    .catch(error => {
        console.error('Error fetching data:', error);
    });
    // Add any additional logic you need here
}

// Assuming maps is an object with map instances, iterate over each map
Object.keys(maps).forEach(mapId => {
const map = maps[mapId];

// Event listener for map clicks to fetch data and display plots
map.on('click', function(e) {
var lat = e.latlng.lat;
var lng = e.latlng.lng;
var time = GetTimeValue(mapId); // Update this function call based on your requirement


// Create popup content with scatterplot options
var popupContent = `
    <div>
        <p>What scatterplot would you like to display?</p>
        <button onclick="setScatterplot('1hr', ${lat}, ${lng}, '${time}')">1 hr fm</button>
        <button onclick="setScatterplot('10hr', ${lat}, ${lng}, '${time}')">10 hr fm</button>
        <button onclick="setScatterplot('100hr', ${lat}, ${lng}, '${time}')">100 hr fm</button>
    </div>
`

  // Show the popup on the map at the clicked location
  L.popup()
  .setLatLng(e.latlng)
  .setContent(popupContent)
  .openOn(map);

});
});

// Function to adjust the y-axis based on the current x-range
document.getElementById('adjust-y-axis').addEventListener('click', function () {
    var plotDiv = document.getElementById('plot');
    var xRange = plotDiv.layout.xaxis.range;

    // Filter data traces associated with the primary y-axis
    var primaryYAxisData = plotDiv.data.filter(trace => trace.yaxis === 'y' || !trace.yaxis);

    var filteredData = primaryYAxisData.map(trace => {
        return trace.y.filter((value, index) => {
            var xValue = new Date(trace.x[index]).getTime();
            return xValue >= new Date(xRange[0]).getTime() && xValue <= new Date(xRange[1]).getTime();
        });
    });

    // Calculate the maximum y-value for the filtered data
    var maxY = Math.max(...filteredData.map(arr => Math.max(...arr)));

    // Adjust the primary y-axis range
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
        document.getElementById('plot-container').style.display = 'none';

});










