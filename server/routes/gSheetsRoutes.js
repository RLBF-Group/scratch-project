const express = require('express');
const fs = require('fs');
const router = express.Router();

//REQUIRE CONTROLLERS
const gSheetsController = require('../controllers/gSheetsController.js');
const sqlController = require('../controllers/sqlController');

// User submitted form on the front end
router.post(
  '/',
  gSheetsController.getData,
  sqlController.createTable,
  (req, res) => {
    res.status(200).json(res.locals.sheetData);
  },
);

//export router
module.exports = router;
