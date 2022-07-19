mapboxgl.accessToken = 'pk.eyJ1IjoidXJiYW4wMSIsImEiOiJjam50MXJoMG4wMXBqM3FwbWViMjN5MW1wIn0.fw5_hMbQv0qyZkLaVJBbFQ';

// Variables to read and store json data with coordinates
// and other config info
tripsFile = 'trips-ec.json';
let trips = {}; // Object that will all json data and routes
let srcArray = []; // Array of map source objects
let layArray = []; // Array of map layer objects

// Variables to control progress and status of animation
let start, previousTimeStamp = [], counter = [], direction = [];
let animRequest;
let animStatus = false;

// map var for mapbox map creation
let map;

function pointOnCircle(i) {
  // Grabs coordinates from trips object
  // and updates coordinates to animate trip(s) on map
  // i is the index of the geopair to animate
  const coord = trips.geopairs[i].mapboxapiroute.routes[0].geometry.coordinates;

  // Show roundtrip
  if ((counter[i] < coord.length) && direction[i]) counter[i]++;
  if ((counter[i] == coord.length)) direction[i] = 0;
  if ((counter[i] > 0) && !direction[i]) counter[i]--;
  if ((counter[i] == 0)) direction[i] = 1;
  return {
    'type': 'Point',
    'coordinates': trips.geopairs[i].mapboxapiroute.routes[0].geometry.coordinates[counter[i]]
  };
}

async function getJsonData(fileName) {
  // Reads the json file containing geopairs and 
  // all config info, returns a json object
  // with all info from the file
  const response = await fetch(fileName);
  const data = await response.json();
  return data;
}

async function getRoute(origin, destination) {
  // Calls Mapbox Directions API and retrieves
  // route for one geopair (retrieved from trips)
  // returns
  const query = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`,
    { method: 'GET' }
  );
  const json = await query.json();
  return json; // return all object (it will be put in trips)
}

async function getAllTripRoutes(trips) {
  // Uses the json routes returned by getRoute and
  // stores inside trips
  for (let i = 0; i < trips.geopairs.length; i++) {
    const org = [trips.geopairs[i].origin];
    const dst = [trips.geopairs[i].destination];
    const res = await getRoute(org, dst);
    trips.geopairs[i].mapboxapiroute = res;
  }
}

async function createSrcAndLyr() {
  // Called after trips has been populated with data from
  // json file, takes this data and creates point and layers
  const shp = 'circle';
  const sze = 15;
  const clr = 'green';
  for (let i = 0; i < trips.geopairs.length; i++) {
    const org = trips.geopairs[i].origin;
    const dst = trips.geopairs[i].destination;
    const shp = trips.geopairs[i].shape;
    const sze = trips.geopairs[i].size;
    const clr = trips.geopairs[i].color;
    srcArray[i] = new PointSource(`point${i}`, org, dst, shp, sze, clr);
  }
}

// The series of promises below make sure all the elements
// have been read before the map is drawn

getJsonData(tripsFile) // Read JSON file  orig/dest, etc
  .then((d) => { trips = d })
  .then(() => getAllTripRoutes(trips)) // Get all coords
  .then(() => createSrcAndLyr())
  .then(() => {
    map = new mapboxgl.Map({
      container: 'map-one',
      style: 'mapbox://styles/mapbox/traffic-night-v2',
      center: [-78, -2], // starting position
      zoom: 6,
      pitch: 30
    });

    map.addControl(new mapboxgl.FullscreenControl());
    
    map.on('load', () => {
      
      // Take source array and add sources and layers to
      // the map
      srcArray.forEach((elem) => {
        map.addSource(elem.pointSourceObj[0], elem.pointSourceObj[1]);
        map.addLayer(elem.pointLayerObj);
      });

      // Zero out elements of previousTimeStamp, counter
      // and direction arrays used 
      // for animation of map elements
      for (let i = 0; i < trips.geopairs.length; i++) {
        previousTimeStamp[i] = 0;
        counter[i] = 0;
        direction[i] = 0;
      }

      function animateMapElements(timestamp) {

        // Iterate over all map elements to be animated
        for (let i = 0; i < trips.geopairs.length; i++) {
          updateRate = trips.geopairs[i].updateRate;

          if (timestamp > (previousTimeStamp[i] + updateRate)) {
            previousTimeStamp[i] = timestamp;
            map.getSource(srcArray[i].id).setData(pointOnCircle(i));
          }
        } // end for i
        
        // Request the next frame of the animation.
        // animateCircle is the callback and is given a timestamp
        // similar to performance.now()
        animRequest = requestAnimationFrame(animateMapElements);
      }


      //Create a new marker.
      const marker = new mapboxgl.Marker(
        {
          color: 'blue',
          draggable: true
        }
      )
        .setLngLat([-78.5, -.18])
        .addTo(map);

      document.getElementById('replay').addEventListener('click', () => {
        // Toggle the animation status then start or stop animation
        animStatus = !animStatus;
        if (!animStatus) cancelAnimationFrame(animRequest);
        else animRequest = animateMapElements(0);
      }); // end event listener click



    }) // end map on load

  }).
  then(() => console.log('Done loading and creating'));



