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
  const regex = /https?:\/\/(www\.)?\w+\.[a-zA-Z]+/;
  return regex.test(entryUrl);
};

const Abbreviation = mongoose.model('Abbreviation', abbreviationSchema);

const formatReturnedAbbreviation = (queryResult) => {
  const neededProperties = ['original_url', 'short_url'];
  const selectObjectProperties = (obj, fieldsArr) => (
    Object.keys(obj).filter((x) => (fieldsArr.includes(x)))
      .reduce((accum, field) => Object.assign(accum, { [field]: obj[field] }), {})
  );
  return selectObjectProperties(queryResult.toObject(), neededProperties);
};

const createNewAbbreviation = (originalUrl, done) => {
  // will break once a certain number of records is reached!
  const createNewAbbreviationId = () => {
    const newUrlId = Math.floor(Math.random() * 100000);
    if (!Abbreviation.find({ urlId: newUrlId }) === []) {
      return createNewAbbreviationId();
    } return newUrlId;
  };

  const newAbbreviation = new Abbreviation();
  newAbbreviation.original_url = originalUrl;
  newAbbreviation.short_url = createNewAbbreviationId();

  newAbbreviation.save().then((x) => done(null, formatReturnedAbbreviation(x)))
    .catch((err) => done(err));
};

app.get('/', (req, res) => {
  res.sendFile(`${process.cwd()}/views/index.html`);
});

app.get('/api/shorturl/:shorturl', (req, res) => {
  Abbreviation.findOne({ short_url: req.params.shorturl }).exec()
    .then((result) => {
      if (result !== null) {
        return res.redirect(result.original_url);
      } return res.json({ error: 'No short url found for the given input.' });
    }, (err) => res.json(err));
});
app.post('/api/shorturl', (req, res) => {
  const entryUrl = req.body.url;
  if (!validateUrl(entryUrl)) return res.json({ error: 'Invalid URL' });

  Abbreviation.findOne({ original_url: entryUrl }).exec()
    .then((result) => {
      if (result !== null) {
        res.json(formatReturnedAbbreviation(result));
      } else {
        createNewAbbreviation(entryUrl, (err, abbreviation) => {
          if (err) res.json(err);
          else res.json(abbreviation);
        });
      }
    }, (error) => res.json(error));
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
