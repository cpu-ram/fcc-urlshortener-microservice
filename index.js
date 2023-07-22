require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

require('dotenv').config();
const mongoose = require('mongoose');

const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.on('error', (err) => {
  console.log(err);
});

// Basic Configuration
const port = process.env.PORT || 3000;
app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));

const abbreviationSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number,
});

const validateUrl = (entryUrl) => {
  const regex=/https?:\/\/www\.\w+\.[a-zA-Z]+/;
  return regex.test(entryUrl);
};

const Abbreviation = mongoose.model('Abbreviation', abbreviationSchema);

const createNewAbbreviation = (originalUrl, done) => { 
  // will break once a certain number of abbreviations is reached!
  const createNewAbbreviationId = () => {
    const newUrlId = Math.floor(Math.random() * 100000);
    if (!Abbreviation.find({ urlId: newUrlId }) === []) {
      return createNewAbbreviationId();
    } return newUrlId;
  };

  const newAbbreviation = new Abbreviation();
  newAbbreviation.original_url = originalUrl;
  newAbbreviation.short_url = createNewAbbreviationId();

  newAbbreviation.save().then((x) => done(null, x.toObject())).catch((err) => console.log(err));
};

app.get('/', (req, res) => {
  res.sendFile(`${process.cwd()}/views/index.html`);
  createNewAbbreviation('abcdef', (x) => console.log(x));
});

app.post('/api/shorturl', (req, res) => {
  const filterObjectFields = (obj, fieldsArr) => (
    Object.keys(obj).filter((x) => (!fieldsArr.includes(x)))
      .reduce((accum, field) => Object.assign(accum, { [field]: obj[field] }), {})
  );
  const entryUrl = req.body.url;
  if (!validateUrl(entryUrl)) res.json({ error: 'Invalid URL' });
  const existingRecord = Abbreviation.findOne({ originalUrl: entryUrl});

  createNewAbbreviation(entryUrl, (err, abbreviation) => {
    if (err) console.log(err);
    const result = Object.keys(abbreviation).filter((x) => (!['__v', '_id'].includes(x))).reduce((accum, field) => Object.assign(accum, { [field]: abbreviation[field] }), {});
    res.json(result);
  });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
