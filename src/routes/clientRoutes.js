    const express = require('express');
const router = express.Router();
const {
  createClient,
  getClients,
  getClientById,
  searchClient,
  updateClient,
  deleteClient
} = require('../controllers/clientController');

router.route('/')
  .post(createClient)
  .get(getClients);

router.get('/search', searchClient);

router.route('/:id')
  .get(getClientById)
  .put(updateClient)
  .delete(deleteClient);

module.exports = router;