var express = require('express')
var bodyParser = require('body-parser')
var iotaCore = require('@iota/core')
var converter = require('@iota/converter')
var extract = require('@iota/extract-json')
var http = require('@iota/http-client')
var {Pool, Client} = require('pg')

var app = express();
var port = process.env.PORT || 5000;
app.use(bodyParser.urlencoded({ extended: false })); // support encoded bodies
app.use(bodyParser.json()); // support json encoded bodies

//MySQL implementation//
const connectionString = 'YourSQLConnectionStringHere'

const client = new Client({
  connectionString: connectionString,
})
client.connect()

const iota = iotaCore.composeAPI({ provider: 'https://testnet140.tangle.works'})

iota.getNodeInfo()
    .then(info => console.log(info))
    .catch(err => {})

const iotaClient = http.createHttpClient({ provider: 'YourURLHere'})
const getNodeInfo = iotaCore.createGetNodeInfo(iotaClient)

// must be truly random & 81-trytes long
const seed = 'YourseedHere'


// Depth or how far to go for tip selection entry point
const depth = 3 

// Difficulty of Proof-of-Work required to attach transaction to tangle.
// Minimum value on mainnet & spamnet is `14`, `9` on devnet and other testnets.
const minWeightMagnitude = 14

app.post('/create', function (req, res) {
const respLat = req.body.lat
const respLon = req.body.lon
const respPower = req.body.power
const respAddress = req.body.address
const uniqueId = req.body.id

const dataObject = {lat: respLat, lon: respLon, power: respPower, address: respAddress}
const dataString = JSON.stringify(dataObject)
const msg = converter.asciiToTrytes(dataString)

// Array of transfers which defines transfer recipients and value transferred in IOTAs.
const transfers = [{address: respAddress, value: 0,  tag: '', message: msg}]

iota.prepareTransfers(seed, transfers)
    .then(trytes => iota.sendTrytes(trytes, depth, minWeightMagnitude))
    .then(bundle => {
        console.log(`Published transaction with tail hash: ${bundle[0].hash}`)
        console.log(`Bundle: ${bundle[0]}`)
        
        const respHash = bundle[0].hash
        const text = 'INSERT INTO powerbanks(hash, unique_id) VALUES($1, $2) RETURNING *;'   
        const values = [respHash, uniqueId]
        // callback
        client.query(text, values, (err, resp) => {
        if (err) {
            console.log(err.stack)
            res.send(err.stack)
        } else {
            console.log(resp.rows[0])
            res.send(resp.rows[0])
        }
        })
    })
    .catch(err => {
        // catch any errors
    })

});

app.post('/update', function (req, res) {
const respLat = req.body.lat
const respLon = req.body.lon
const respPower = req.body.power
const respAddress = req.body.address
const uniqueId = req.body.id

const dataObject = {lat: respLat, lon: respLon, power: respPower, address: respAddress}
const dataString = JSON.stringify(dataObject)
const msg = converter.asciiToTrytes(dataString)

// Array of transfers which defines transfer recipients and value transferred in IOTAs.
const transfers = [{address: respAddress, value: 0,  tag: '', message: msg}]

iota.prepareTransfers(seed, transfers)
    .then(trytes => iota.sendTrytes(trytes, depth, minWeightMagnitude))
    .then(bundle => {
        console.log(`Published transaction with tail hash: ${bundle[0].hash}`)
        console.log(`Bundle: ${bundle[0]}`)
        
        const respHash = bundle[0].hash
        const text = 'UPDATE powerbanks SET hash = $1 WHERE unique_id = $2 RETURNING *;'   
        const values = [respHash, uniqueId]
        // callback
        client.query(text, values, (err, resp) => {
        if (err) {
            console.log(err.stack)
            res.send(err.stack)
        } else {
            console.log(resp.rows[0])
            res.send(resp.rows[0])
        }
        })
    })
    .catch(err => {
        // catch any errors
    })

});

app.post('/search', function(req, res){
    
    const myLat = req.body.lat
    const myLon = req.body.lon
    var distances = []
    var i
    var small = 100000.00
    
    const text = 'SELECT hash FROM powerbanks;'   
    // callback
    client.query(text, (err, resp) => {
    if (err) {
        console.log(err.stack)
        res.send(err.stack)
    } else {
        
        for(i = 0; i < resp.rows.length; i++){
        //const respString = JSON.stringify(resp.rows[i])
        
        iota.getBundle(resp.rows[i].hash)
            .then(bundle => {
            const msg = JSON.parse(extract.extractJson(bundle))
            var lat = msg.lat
            var lon = msg.lon
            
            distances[i] = getDistance(myLat, myLon, lat, lon)
            
            if(small > distances[i]){
                small = distances[i]
                console.log(small)
            }
            
            if(i == resp.rows.length){
                res.send('Smallest distance is: ' + small)
            }
            })
            .catch(err => {
                res.send(err.stack)
            })
        
        }
    }
    })

});

app.get('/', function (req, res) { 
    
    res.send('connected')


});

//Distance Function//
function getDistance(lat1,lon1,lat2,lon2) {
    var R = 6371 // Radius of the earth in km
    var lat1 = toRad(lat1)
    var lat2 = toRad(lat2)
    var latDis = toRad(lat2-lat1)
    var lonDis = toRad(lon2-lon1)

    var a = Math.sin(latDis/2) * Math.sin(latDis/2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(lonDis/2) * Math.sin(lonDis/2)
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    var d = R * c
    
    return d
}

//converting degrees to radias//
function toRad(deg) {
  return deg * (Math.PI/180)
}


app.listen(port);

