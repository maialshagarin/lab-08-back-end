'use strict'


require('dotenv').config();
const express = require('express');
const cors = require('cors');
const superagent = require('superagent')

const PORT = process.env.PORT;
const pg = require('pg');
const server = express();

server.use(cors());
const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', err => console.error(err));


// ////// call the handler function 

server.get('/location', locationHandler);
server.get('/weather', weatherHanddler);
server.get('/events', eventHanddler); ////// here i have a problem and gorob help me to solve it //////

// /////// location handler //////
// function locationHandler(req, res) {
//   const city = req.query.data;
//   console.log('cityyyyyyyyyyyyyyyyyyyyyyyyy' , city);

//   getlocation(city)
//     // .then(locationData => res.status(200).json(locationData));
//     .then(data => res.status(200).json(weatherData))
//     .catch((error) => errorHandler(error, req, res));
// };
function locationHandler(req, res) {
  // getLocation(request.query.data)             // Get city input from user
  //   .then( locationData => response.status(200).json(locationData) );            // To show up the generated data
  const city = req.query.data;
  console.log('cityyyyyyyyyyyyyyyyyyyyyyyyyyyyy : ', city);
  getLocation(city)
    // .then(locationData => res.status(200).json(locationData));
    .then(data => res.status(200).json(data))
    .catch((error) => errorHandler(error, req, res));
}



// ///// weather handler ////////
function weatherHanddler(req, res) {

  getWeather(req.query.data)
    .then(weatherData => res.status(200).json(weatherData));
};


// ///// event handler /////////////// 
function eventHanddler(req, res) {
  getEventINFO(req.query.data)
    .then(eventData => res.status(200).json(eventData));
};
// ///// get the data from API for location /////
function getLocation(city) {
  let SQL = 'select * FROM location WHERE search_query = $1 ';
  let values = [city];
  return client.query(SQL, values)
    .then(results => {
      if (results.rowCount) {
        return results.rows[0];
      }
      else {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${city}&key=${process.env.GEOCODE_API_KEY}`;
        // let SQL = 'INSERT INTO location (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING *';

        return superagent.get(url)
          .then(data => cacheLocation(city, data.body));
      }
      // return new Location (city , data.body)
    });
};
let cache = {};
function cacheLocation(city, data) {
  const location = new Location(data.results[0]);
  let SQL = 'INSERT INTO location (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING *';
  let values = [city, location.formatted_query, location.latitude, location.longitude];
  return client.query(SQL, values)
    .then(results => {
      const savedLocation = results.rows[0];
      cache[city] = savedLocation;
      return savedLocation;
    });
}

// /////  get the data from API for weather /////
function getWeather(query) {
  const url = `https://api.darksky.net/forecast/${process.env.DARKSKY_API_KEY}/${query.latitude},${query.longitude}`;
  return superagent.get(url)
    .then(data => {
      let weather = data.body;
      return weather.daily.data.map((day) => {
        return new Weather(day);
      });
    });
};
// /////  get the data from API for weather /////
function getEventINFO(query) {
  const url = `http://api.eventful.com/json/events/search?app_key=${process.env.EVENTBRITE_API_KEY}&location=${query.formatted_query}`;
  return superagent.get(url)
    .then(data => {
      let eventl = JSON.parse(data.text);
      return eventl.events.event.map((day) => {
        return new Event(day);
      });
    });
};

// ////// the constactour function of location to organize data ////////
function Location(city, data) {
  // this.search_query = city;
  this.formatted_query = data.results[0].formatted_address;
  this.latitude = data.results[0].geometry.location.lat;
  this.longitude = data.results[0].geometry.location.lng;
}

// ////// the constactour function of weather to organize data ////////

function Weather(day) {

  this.forecast = day.summary;
  this.time = new Date(day.time * 1000).toDateString();

}
// ////// the constactour function of Event to organize data ////////

function Event(day) {
  this.link = day.url;
  this.name = day.title;
  this.event_date = day.start_time;
  this.summary = day.description

}
// function sendJson(data, res){
//   res.status(200).json(data);
// }
// ////// error 

server.use('*', (req, res) => {
  res.status(404).send('?????????');
});

server.get('*', (request, Response) => {
  Response.status(500).send('Sorry, something went wrong');
});
function errorHandler(error, req, res) {
  res.status(500).send(error);
}
// ///// listen to app 
client.connect()
  .then(() => {
    server.listen(PORT, () => console.log(`App listening on ${PORT}`))
  });



  // 'use strict';
  // require('dotenv').config();

  // const express = require('express');
  // const cors = require('cors');
  // const client = require