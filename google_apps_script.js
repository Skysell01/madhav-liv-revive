/**
 * ==============================================================================
 * MADHAVBAUG LIVO SHOTS (LIVER CARE & DETOX) - GOOGLE APPS SCRIPT WEBHOOK CODE
 * ==============================================================================
 * इसे अपनी नई Google Sheets में Setup करने के आसान चरण:
 * 
 * 1. अपनी नई या मौजूदा Google Sheet खोलें जहाँ Leads एकत्रित करनी हैं।
 * 2. ऊपर मेन्यू में "Extensions" (एक्सटेंशन) -> "Apps Script" पर क्लिक करें।
 * 3. पहले से लिखे कोड/फ़ंक्शन को पूरी तरह हटाएँ, और यह पूरा कोड वहाँ पेस्ट कर दें।
 * 4. ऊपर "Save" (सेव) आइकॉन पर क्लिक करें।
 * 5. ऊपर दाहिने कोने में "Deploy" (डिप्लॉय) बटन पर क्लिक करें -> "New deployment" चुनें।
 * 6. 'Select type' के गियर आइकॉन पर क्लिक करके "Web app" चुनें।
 * 7. Description में लिखें: "Madhavbaug Livo Shots Leads Webhook"
 * 8. "Execute as": "Me" (मेरा गूगल खाता) चुनें।
 * 9. "Who has access": "Anyone" (महत्वपूर्ण: Anyone ही चुनना चाहिए ताकि फॉर्म सबमिट हो सके)।
 * 10. "Deploy" पर क्लिक करें और Google Permissions को Authorize करें।
 * 11. जो नया "Web App URL" मिलेगा (उदा. https://script.google.com/macros/s/.../exec)
 *     उसे कॉपी करके इस प्रोजेक्ट की `assets/js/main.js` फ़ाइल में 
 *     `GOOGLE_SHEETS_WEBHOOK_URL` की जगह पेस्ट कर दें!
 * ==============================================================================
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  // 10 सेकंड तक इंतज़ार करें ताकि एक साथ आने वाली रिक्वेस्ट मिस न हों
  lock.tryLock(10000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var rawData = e.postData.contents;
    var data;

    try {
      data = JSON.parse(rawData);
    } catch (parseErr) {
      data = e.parameter;
    }

    // यदि शीट बिल्कुल खाली है, तो हेडर्स पंक्ति को ऑटोमैटिक बना दें
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp (तारीख व समय)",
        "Order ID (ऑर्डर संख्या)",
        "Name (ग्राहक का नाम)",
        "Contact Number (मोबाइल नंबर)",
        "Address (डिलीवरी पता)",
        "City (शहर)",
        "State (राज्य)",
        "Package (चुना गया पैक)",
        "Price (कीमत)",
        "Payment Mode (भुगतान प्रकार)",
        "Landing Page URL"
      ]);
      
      // Madhavbaug Liver Emerald Green (#065F46) रंग वाली हेडर स्टाइलिंग
      var headerRange = sheet.getRange(1, 1, 1, 11);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#065F46");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

    // 10 अंकों का केवल मोबाइल नंबर निकालें
    var contactNumber = String(data.contact || "").replace(/\D/g, "").slice(-10);

    // 24-घंटे डुप्लीकेट रोक जांच (ताकि एक ग्राहक बार-बार सबमिट न कर पाए)
    if (contactNumber && contactNumber.length === 10) {
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        var values = sheet.getRange(2, 1, lastRow - 1, 4).getValues(); // Col 1: Timestamp, Col 2: OrderID, Col 3: Name, Col 4: Contact
        var now = new Date();
        var oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        for (var i = values.length - 1; i >= 0; i--) {
          var rowContact = String(values[i][3] || "").replace(/\D/g, "").slice(-10);
          if (rowContact === contactNumber) {
            var rowTime = new Date(values[i][0]);
            // यदि पिछला सबमिशन 24 घंटे के भीतर हुआ हो
            if (isNaN(rowTime.getTime()) || rowTime >= oneDayAgo) {
              return ContentService
                .createTextOutput(JSON.stringify({
                  status: "already_submitted",
                  message: "Already submitted form. Wait for 24hr, our liver health expert will call you shortly."
                }))
                .setMimeType(ContentService.MimeType.JSON);
            }
          }
        }
      }
    }

    // नया ऑर्डर आईडी और टाइमस्टैम्प तैयार करें
    var orderId = data.orderId || ("MDB-LIV-" + Math.floor(10000 + Math.random() * 90000));
    var timestamp = data.timestamp || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    sheet.appendRow([
      timestamp,
      orderId,
      data.name || "Customer",
      data.contact ? "'" + data.contact : "", // अपोस्ट्रॉफी (') लगाने से एक्सेल/गूगल शीट नंबर ट्रंकेट नहीं करता
      data.address || "-",
      data.city || "-",
      data.state || "-",
      data.package || "Livo Shots",
      data.price || "-",
      data.paymentMode || "Cash On Delivery (COD)",
      data.pageUrl || ""
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({
        status: "success",
        message: "Liver Care Lead saved successfully",
        orderId: orderId
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "error",
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// यह जांचने के लिए कि URL ब्राउज़र में सही चल रहा है
function doGet(e) {
  return ContentService.createTextOutput("🌿 Madhavbaug Livo Shots (Liver Care) Webhook is Live and Active!");
}
