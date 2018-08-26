//Web hosting t8nis#bLiN^C2AnMWm3B//
var express = require('express')
var bodyParser = require('body-parser');
const IOTA = require('iota.lib.js')
var Mam = require('./lib/mam.node.js');

const iota = new IOTA({ provider: `https://testnet140.tangle.works` })

var app = express();
var port = process.env.PORT || 5000;
app.use(bodyParser.urlencoded({ extended: false })); // support encoded bodies
app.use(bodyParser.json()); // support json encoded bodies

app.post('/iota', function (req, res) {
// MAM
let root = ''
//yylet seed = 'MYLITTLESECRET'
let mamState = Mam.init(iota)

const power = req.body.power
const units = req.body.units
     
// Publish to tangle
const publish = async packet => {
    const trytes = iota.utils.toTrytes(JSON.stringify(packet))
    const message = Mam.create(mamState, trytes)
    mamState = message.state
    
    await Mam.attach(message.payload, message.address)
    return message.root
    
}

// Callback used to pass data out of the fetch
const logData = data => console.log(JSON.parse(iota.utils.fromTrytes(data)))

const execute = async () => {
    // Publish and save root.
    root = await publish('Power is: ' + power + ' ' + units)
    
    // Publish but not save root
    //await publish('Second')
    //await publish('Third')
    
    // Callback used to pass data + returns next_root
    const resp = await Mam.fetch(root, 'public', null, logData)
    
    res.send('First root is: ' + root + ' Next root is: ' + resp)
}

execute()

});

app.get('/', function (req, res) {
    
    res.send('Starting Screen')

    
});




app.listen(port);

