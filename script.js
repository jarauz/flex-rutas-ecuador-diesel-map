mapboxgl.accessToken = 'pk.eyJ1IjoidXJiYW4wMSIsImEiOiJjam50MXJoMG4wMXBqM3FwbWViMjN5MW1wIn0.fw5_hMbQv0qyZkLaVJBbFQ';

var orientation = (screen.orientation || {}).type || screen.mozOrientation || screen.msOrientation;

console.log(orientation);



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

// Var to control show/not show of routes
let showRoutes = true;
let totalRouteLengthKm = 0;
let kmPerGalon = 25;
let daysActivePerYear = 300;
let energySource = 0; // 0 is Diesel, 1 is Electric
let numRoutes = 11; // Has to match the total number of routes
let galDieselPrice = 1.7; // Price onf one gallon of diesel ECU
let kWhPrice = 0.12; // Price of one kilowatt hour
let rangeBatteryKm = 275 * 1.6; // truck range
let batteryCapacitykWh = 565; // truck battery capacity

// map var for mapbox map creation
let map;

// controls
let sliderTrucks = document.getElementById('camionesRutaOutputId');
let sliderSubsidy = document.getElementById('subsidioGalonOutputId')

if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){
  // true for mobile device
  console.log("mobile device");
}else{
  // false for not mobile device
  console.log("not mobile device");
}

function computeTotalDTravel(v) {
  //update displayed value when slider of number of trucks changes
  sliderTrucks.value=v;
  let d1 = document.getElementById('recorrido-total-anual');
  let d2 = document.getElementById('subsidio-total');
  let totalDistance = Math.round( 
    v * totalRouteLengthKm * daysActivePerYear);
  let totalSubsidy = Math.round(
    totalDistance / kmPerGalon 
    * Number(sliderSubsidy.value) );
  let totalDistanceMillionsKm = Math.round(totalDistance/1000000);
  let totalSubsidyMillionsUsd = (totalSubsidy/1000000).toFixed(1);
  d1.innerHTML= `${totalDistanceMillionsKm
                   .toLocaleString('es-US')} Millones de Km`;
  d2.innerHTML= `${totalSubsidyMillionsUsd.
                   toLocaleString('es-US')} Millones de USD`;
}

function computeSubsidy(v) {
  //update displayed value when slider of number of trucks changes
  sliderSubsidy.value=v;
  let d2 = document.getElementById('subsidio-total');
  let totalDistance = Math.round( 
    Number(sliderTrucks.value) * totalRouteLengthKm * daysActivePerYear);
  let totalSubsidy = Math.round(
    totalDistance / kmPerGalon 
    * Number(sliderSubsidy.value) );
  let totalSubsidyMillionsUsd = (totalSubsidy/1000000).toFixed(1);
  d2.innerHTML= `${totalSubsidyMillionsUsd.
                   toLocaleString('es-US')} Millones de USD`;
}

function energySourceChange(){
  energySource = (energySource + 1) % 2; // Switch between 0 and 1 with clicks
  let d1 = document.getElementById('energia-camion');
  let d2 = document.getElementById('gasto-camion');
  if (energySource === 0){
    // if Diesel
    d1.innerHTML='ANUAL EN DIESEL';
    d2.innerHTML=`${Math.round(totalRouteLengthKm
                        / numRoutes
                        * daysActivePerYear
                        / kmPerGalon
                        * galDieselPrice)
                        } USD`;
  } else{
    // if Electric
    d1.innerHTML='ANUAL ELECTRICIDAD';
    d2.innerHTML=`${Math.round(totalRouteLengthKm
                        / numRoutes
                        * batteryCapacitykWh
                        / rangeBatteryKm
                        * daysActivePerYear
                        * kWhPrice)
                        } USD`;
    document.getElementById('subsidio-total').innerHTML=`0 USD`;
  }
}



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
    'coordinates': trips.geopairs[i].mapboxapiroute
      .routes[0].geometry.coordinates[counter[i]]
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
  // Populates srcArray which has one entry per geopair
  // Elements of srcArray are objects
  // Each element has points and layers
  const shp = 'circle';
  const sze = 15;
  const clr = 'green';
  for (let i = 0; i < trips.geopairs.length; i++) {
    const org = trips.geopairs[i].origin;
    const dst = trips.geopairs[i].destination;
    const shp = trips.geopairs[i].shape;
    const sze = trips.geopairs[i].size;
    const clr = trips.geopairs[i].color;
    srcArray[i] = new PointSource(i, org, dst, shp, sze, clr);
  }
}

async function computeDistance(){
// Computes the sum of the lengths of all routes
  srcArray.forEach((elem,index) => {
    totalRouteLengthKm += 
      trips.geopairs[index].mapboxapiroute.routes[0].distance;
  });
    totalRouteLengthKm = totalRouteLengthKm/1000 * 2;// round trip
    console.log(totalRouteLengthKm) ;
  
}

// The series of promises below make sure all the elements
// have been read before the map is drawn
getJsonData(tripsFile) // Read JSON file  orig/dest, etc
  .then((d) => { trips = d })
  .then(() => getAllTripRoutes(trips)) // Get all coords
  .then(() => createSrcAndLyr()) // Creates srcArray
  .then(() => computeDistance())
  .then(() => {
    map = new mapboxgl.Map({
      container: 'map-one',
      style: 'mapbox://styles/mapbox/traffic-night-v2',
      center: [-79.5, -2.2], // starting position
      zoom: 7,
      pitch: 50
    });
    
    map.on('load', () => {

    map.addControl(new mapboxgl.FullscreenControl());
    // Add zoom and rotation controls to the map.
    map.addControl(new mapboxgl.NavigationControl());
      
      // Take source array and add sources and layers to
      // the map
      srcArray.forEach((elem,index) => {

        // Before adding the route, add coords to route
        // the coords are in trips var
        elem.routeSourceObj[1].data.geometry.coordinates = 
          trips.geopairs[index].mapboxapiroute
          .routes[0].geometry.coordinates;

        // Add routes sources and layers for the routes
        map.addSource(elem.routeSourceObj[0],
                     elem.routeSourceObj[1]);
        map.addLayer(elem.routeLayerObj);

        
        // Add point sourcesand layers for the points
        map.addSource(elem.pointSourceObj[0],
                      elem.pointSourceObj[1]);
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

          // Check if it is time to move the point 
          if (timestamp > (previousTimeStamp[i] + updateRate)) {
            previousTimeStamp[i] = timestamp;
            map.getSource(srcArray[i].pointSourceObj[0])
              .setData(pointOnCircle(i));
          }
        } // end for i
        
        // Request the next frame of the animation.
        // animateCircle is the callback and is given a timestamp
        // similar to performance.now()
        animRequest = requestAnimationFrame(animateMapElements);
      }

      animStatus=true;
      animateMapElements(0);
      
      document.getElementById('replay').
        addEventListener('click', () => {
        // Toggle the animation status 
        // then start or stop animation
        animStatus = !animStatus;
        if (!animStatus) {
          cancelAnimationFrame(animRequest);
          document.getElementById('replay').innerHTML="Animar";
        }
        else {
          animRequest = animateMapElements(0);
          document.getElementById('replay')
            .innerHTML="Detener";
        }
        }); // end event listener click animate button

      document.getElementById('rutas').
        addEventListener('click', () => {
        // Mostrar y ocultar rutas
        showRoutes = !showRoutes;
        if (!showRoutes) {
            srcArray.forEach((elem,index) => {
            map.removeLayer(elem.routeLayerObj.id)
            });  
            document.getElementById('rutas').
              innerHTML="Mostrar<br>Rutas";
        } else {
            srcArray.forEach((elem,index) => {
            map.addLayer(elem.routeLayerObj)
            }); 
            document.getElementById('rutas')
              .innerHTML="Ocultar<br>Rutas";
        }
        }); // end event listener click routes

      document.getElementById('distancia-recorrida')
        .innerHTML=`${Math.round(totalRouteLengthKm)} Km`;
      
      document.getElementById('recorrido-total-anual')
        .innerHTML=`${Math.round(
          totalRouteLengthKm 
          * sliderTrucks.value 
          * daysActivePerYear
          /1000000)
          .toLocaleString('es-US')} Millones Km`;

      document.getElementById('subsidio-total')
        .innerHTML=`${Math.round(
          totalRouteLengthKm
          * sliderTrucks.value
          * daysActivePerYear 
          / kmPerGalon
          * sliderSubsidy.value
          / 1000000)
          .toLocaleString('es-US')} Millones de USD`;

      document.getElementById('gasto-camion')
        .innerHTML = `${Math.round(totalRouteLengthKm
                        / numRoutes
                        * daysActivePerYear
                        / kmPerGalon
                        * galDieselPrice)
                        } USD`;

      addEventListener('orientationchange', event => {
          console.log('orientation changed to:', 
                      orientation);
      });



    }) // end map on load

  }).
  then(() => console.log('Done loading and creating'));


