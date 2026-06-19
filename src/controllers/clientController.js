const Client = require('../models/Client');

// @desc    Create new client
// @route   POST /api/clients
const createClient = async (req, res) => {
  try {
    const { name, mobile, gstNumber, adhaarNumber, panNumber } = req.body;
    
    if (!name || !mobile) {
      return res.status(400).json({
        success: false,
        message: 'Name and mobile are required'
      });
    }
    
    // Check for existing client with same ID
    if (gstNumber) {
      const existing = await Client.findOne({ gstNumber });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Client with this GST number already exists'
        });
      }
    }
    
    if (adhaarNumber) {
      const existing = await Client.findOne({ adhaarNumber });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Client with this Adhaar number already exists'
        });
      }
    }
    
    if (panNumber) {
      const existing = await Client.findOne({ panNumber });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Client with this PAN number already exists'
        });
      }
    }
    
    const client = new Client(req.body);
    await client.save();
    
    res.status(201).json({
      success: true,
      data: client,
      message: 'Client created successfully'
    });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all clients
// @route   GET /api/clients
const getClients = async (req, res) => {
  try {
    const { search, type, isActive, page = 1, limit = 50 } = req.query;
    
    const query = {};
    if (type) query.clientType = { $in: [type, 'both'] };
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { gstNumber: { $regex: search, $options: 'i' } },
        { panNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [clients, total] = await Promise.all([
      Client.find(query).sort({ name: 1 }).skip(skip).limit(parseInt(limit)),
      Client.countDocuments(query)
    ]);
    
    res.status(200).json({
      success: true,
      data: clients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get client by ID
// @route   GET /api/clients/:id
const getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: client
    });
  } catch (error) {
    console.error('Get client by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Search client by ID type
// @route   GET /api/clients/search
const searchClient = async (req, res) => {
  try {
    const { idType, idValue, name } = req.query;

    // NAME SEARCH
    if (name) {
      const clients = await Client.find({
        name: {
          $regex: name,
          $options: "i",
        },
      }).limit(20);

      return res.status(200).json({
        success: true,
        data: clients,
        count: clients.length,
      });
    }

    // GST / PAN / ADHAAR SEARCH
    if (!idType || !idValue) {
      return res.status(400).json({
        success: false,
        message: "idType and idValue are required",
      });
    }

    let query = {};

    switch (idType) {
      case "GST Number":
        query = { gstNumber: idValue };
        break;

      case "Adhaar Number":
        query = { adhaarNumber: idValue };
        break;

      case "PAN Number":
        query = { panNumber: idValue };
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid ID type",
        });
    }

    const client = await Client.findOne(query);

    return res.status(200).json({
      success: true,
      data: client || null,
      message: client ? "Client found" : "Client not found",
    });

  } catch (error) {
    console.error("Search client error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update client
// @route   PUT /api/clients/:id
const updateClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }
    
    const updatedClient = await Client.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedClient,
      message: 'Client updated successfully'
    });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete client
// @route   DELETE /api/clients/:id
const deleteClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }
    
    await client.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createClient,
  getClients,
  getClientById,
  searchClient,
  updateClient,
  deleteClient
};  