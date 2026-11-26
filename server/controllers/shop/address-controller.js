import Address from "../../models/Address.js";

const ADDRESS_FIELDS = ["address", "city", "pincode", "phone", "notes"];

const pickAddressFields = (body) =>
  ADDRESS_FIELDS.reduce((acc, field) => {
    if (typeof body[field] === "string") acc[field] = body[field].trim();
    return acc;
  }, {});

export const addAddress = async (req, res) => {
  try {
    // Ownership comes from the verified session, never from the request body.
    const userId = req.user.id;
    const fields = pickAddressFields(req.body);

    if (!fields.address || !fields.city || !fields.pincode || !fields.phone) {
      return res.status(400).json({
        success: false,
        message: "Address, city, pincode and phone are required.",
      });
    }

    const newlyCreatedAddress = await Address.create({ userId, ...fields });

    return res.status(201).json({ success: true, data: newlyCreatedAddress });
  } catch (error) {
    console.error("Add address error:", error);
    return res.status(500).json({ success: false, message: "Error" });
  }
};

export const fetchAllAddress = async (req, res) => {
  try {
    const addressList = await Address.find({ userId: req.user.id });
    return res.status(200).json({ success: true, data: addressList });
  } catch (error) {
    console.error("Fetch address error:", error);
    return res.status(500).json({ success: false, message: "Error" });
  }
};

export const editAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    if (!addressId) {
      return res
        .status(400)
        .json({ success: false, message: "Address id is required!" });
    }

    const address = await Address.findOneAndUpdate(
      { _id: addressId, userId: req.user.id },
      pickAddressFields(req.body),
      { new: true, runValidators: true }
    );

    if (!address) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    return res.status(200).json({ success: true, data: address });
  } catch (error) {
    console.error("Edit address error:", error);
    return res.status(500).json({ success: false, message: "Error" });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    if (!addressId) {
      return res
        .status(400)
        .json({ success: false, message: "Address id is required!" });
    }

    const address = await Address.findOneAndDelete({
      _id: addressId,
      userId: req.user.id,
    });

    if (!address) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Address deleted successfully" });
  } catch (error) {
    console.error("Delete address error:", error);
    return res.status(500).json({ success: false, message: "Error" });
  }
};

export default { addAddress, editAddress, fetchAllAddress, deleteAddress };
