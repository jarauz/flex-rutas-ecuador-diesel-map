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
        this.id,
        {
        'type': 'geojson',
        'data': 
          {
          'type': 'Point',
          'coordinates':  this.origin 
          }
        }
      ]
    this.pointLayerObj =
      {
        'id': this.id,
        'source': this.id,
        'type': this.shape,
      'paint': 
        {
          'circle-radius': this.size,
          'circle-color': this.color
        }
      }
  }
}