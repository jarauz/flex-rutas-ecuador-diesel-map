class PointSource{
  constructor (id, origin, destination, shape, size, color) {
    this.id = id;
    this.origin = origin;
    this.destination = destination;
    this.shape = shape,
    this.size = size,
    this.color = color,

    this.pointSourceObj = 
      [
        `point${this.id}`,
        {
        'type': 'geojson',
        'data': 
          {
          'type': 'Point',
          'coordinates':  this.origin 
          }
        }
      ];
    this.pointLayerObj =
      {
        'id': `point${this.id}`,
        'source': `point${this.id}`,
        'type': this.shape,
        'paint': 
          {
            'circle-radius': this.size,
            'circle-color': this.color
          }
      };
    this.routeSourceObj =
      [
        `route${this.id}`,
        {
            'type': 'geojson',
            'data': {
            'type': 'Feature',
            'properties': {},
            'geometry': {
            'type': 'LineString',
            'coordinates': []
            }
          }
        }  
      ];
    this.routeLayerObj =
      {
          'id': `route${this.id}`,
          'type': 'line',
          'source': `route${this.id}`,
          'layout': {
            'line-join': 'round',
            'line-cap': 'round'
            },
          'paint': {
            'line-color': this.color,
            'line-width': 3,
            'line-opacity': 0.4
            }
      };

  } // end constructor
} // end class

