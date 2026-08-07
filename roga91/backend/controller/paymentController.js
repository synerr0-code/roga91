const https = require("https");
const path=require('path');
const db = require("../config/db");
require('dotenv').config({ path: path.resolve(__dirname, '/root/regan/roga91/.env') });
/**
 * Initializes a payment using Paystack and stores it in the database.
 */
const initializePayment = async (req, res) => {
  try {
    const { name, email, phone, amount, type, description } = req.body;

    if (!name || !email || !phone || !amount || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!["donation", "roga91_dues", "roga_national_dues"].includes(type)) {
      return res.status(400).json({ error: "Invalid payment type" });
    }

    if (amount < 100) {
      return res.status(400).json({ error: "Minimum amount is ₦100" });
    }

    let subaccount;
    switch (type) {
      case "donation":
        subaccount = process.env.PAYSTACK_DONATION_SUBACCOUNT;
        break;
      case "roga91_dues":
        subaccount = process.env.PAYSTACK_ROGA91_DUES_SUBACCOUNT;
        break;
      case "roga_national_dues":
        subaccount = process.env.PAYSTACK_ROGA_NATIONAL_DUES_SUBACCOUNT;
        break;
      default:
        return res.status(400).json({ error: "Invalid payment type" });
    }

    const reference = `ROGA91_${type.toUpperCase()}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const displayNames = {
      donation: "Donation",
      roga91_dues: "ROGA 91 Dues Payment",
      roga_national_dues: "ROGA National Dues Payment",
    };

    // Prepare custom fields for Paystack
    const customFields = [
      {
        display_name: "Payment Type",
        variable_name: "payment_type",
        value: displayNames[type],
      },
      {
        display_name: "Member Name",
        variable_name: "member_name",
        value: name,
      },
    ];

    const isDonation = type === "donation";
    const trimmedDescription =
      isDonation && description && description.trim().length > 0
        ? description.trim()
        : null;

    // If it's a donation and description exists, add it to custom fields
    if (trimmedDescription) {
      customFields.push({
        display_name: "Donation Purpose",
        variable_name: "donation_purpose",
        value: trimmedDescription,
      });
    }

    const paystackPayload = JSON.stringify({
      email,
      amount: amount * 100,
      reference,
      subaccount,
      metadata: {
        name,
        email,
        phone,
        type,
        description: trimmedDescription,
        custom_fields: customFields,
      },
      callback_url: `${process.env.BASE_URL}/api/payment/verify?reference=${reference}`,
    });

    const options = {
      hostname: "api.paystack.co",
      port: 443,
      path: "/transaction/initialize",
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    };

    const paystackReq = https.request(options, (paystackRes) => {
      let data = "";

      paystackRes.on("data", (chunk) => {
        data += chunk;
      });

      paystackRes.on("end", async () => {
        try {
          const response = JSON.parse(data);

          if (response.status) {
            await db.query(
              "INSERT INTO payments (name, email, phone, amount, type, description, reference) VALUES ($1, $2, $3, $4, $5, $6, $7)",
              [
                name,
                email,
                phone,
                amount,
                type,
                isDonation ? trimmedDescription : null,
                reference,
              ]
            );

            res.json({
              authorization_url: response.data.authorization_url,
              reference: reference,
            });
          } else {
            console.error("Paystack initialization failed:", response);
            res.status(500).json({ error: "Payment initialization failed" });
          }
        } catch (error) {
          console.error("Error parsing Paystack response:", error);
          res.status(500).json({ error: "Payment initialization failed" });
        }
      });
    });

    paystackReq.on("error", (error) => {
      console.error("Paystack request error:", error);
      res.status(500).json({ error: "Payment initialization failed" });
    });

    paystackReq.write(paystackPayload);
    paystackReq.end();
  } catch (error) {
    console.error("Payment initialization error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Verifies a payment using Paystack and updates the DB record.
 */
const verifyPayment = async (req, res) => {
  try {
    let reference = req.query.reference;
    if (Array.isArray(reference)) {
      reference = reference[0];
    }

    if (!reference) {
      return res.redirect("/failure.html");
    }

    const options = {
      hostname: "api.paystack.co",
      port: 443,
      path: `/transaction/verify/${reference}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    };

    const paystackReq = https.request(options, (paystackRes) => {
      let data = "";

      paystackRes.on("data", (chunk) => {
        data += chunk;
      });

      paystackRes.on("end", async () => {
        try {
          const result = JSON.parse(data);

          if (result.status && result.data.status === "success") {
            await db.query(
              "UPDATE payments SET verified = true, verified_at = NOW() WHERE reference = $1",
              [reference]
            );
            return res.redirect("/success.html");
          } else {
            await db.query(
              "UPDATE payments SET verified = false, verified_at = NOW() WHERE reference = $1",
              [reference]
            );
            return res.redirect("/failure.html");
          }
        } catch (error) {
          console.error("Error parsing verification response:", error);
          return res.redirect("/failure.html");
        }
      });
    });

    paystackReq.on("error", (error) => {
      console.error("Payment verification error:", error);
      res.redirect("/failure.html");
    });

    paystackReq.end();
  } catch (error) {
    console.error("Payment verification error:", error);
    res.redirect("/failure.html");
  }
};

module.exports = {
  initializePayment,
  verifyPayment,
};
