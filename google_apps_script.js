/**
 * ==============================================================================
 * MADHAVBAUG LIVO SHOTS (LIVER CARE & DETOX) - GOOGLE APPS SCRIPT WEBHOOK CODE
 * ==============================================================================
 * इसे अपनी Google Sheet में Setup करने के आसान चरण:
 * 
 * 1. अपनी नई या मौजूदा Google Sheet खोलें जहाँ Leads एकत्रित करनी हैं।
 * 2. ऊपर मेन्यू में "Extensions" (एक्सटेंशन) -> "Apps Script" पर क्लिक करें।
 * 3. पहले से लिखे कोड/फ़ंक्शन को पूरी तरह हटाएँ, और यह पूरा कोड वहाँ पेस्ट कर दें।
 * 4. ऊपर "Save" (सेव) आइकॉन पर क्लिक करें।
 * 5. ऊपर दाहिने कोने में "Deploy" (डिप्लॉय) बटन पर क्लिक करें -> "Manage deployments" या "New deployment" चुनें।
 * 6. 'Select type' के गियर आइकॉन पर क्लिक करके "Web app" चुनें।
 * 7. Description में लिखें: "Madhavbaug Livo Shots Leads Webhook v2"
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
  // 10 सेकंड तक इंतज़ार करें ताकि एक साथ आने वाली समानांतर रिक्वेस्ट मिस न हों
  lock.tryLock(10000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var rawData = e && e.postData ? e.postData.contents : null;
    var data;

    try {
      data = rawData ? JSON.parse(rawData) : e.parameter;
    } catch (parseErr) {
      data = e.parameter || {};
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

    // 24-घंटे डुप्लीकेट रोक जांच (ताकि एक ग्राहक 24 घंटे में दोबारा सबमिट न कर पाए)
    if (contactNumber && contactNumber.length === 10) {
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        var numCols = Math.max(sheet.getLastColumn(), 4);
        var headers = sheet.getRange(1, 1, 1, numCols).getValues()[0];
        
        var contactColIdx = 4; // डिफ़ॉल्ट Col 4
        var timeColIdx = 1;    // डिफ़ॉल्ट Col 1

        for (var h = 0; h < headers.length; h++) {
          var hName = String(headers[h] || "").toLowerCase();
          if (hName.indexOf("contact") !== -1 || hName.indexOf("mobile") !== -1 || hName.indexOf("phone") !== -1 || hName.indexOf("नंबर") !== -1) {
            contactColIdx = h + 1;
          }
          if (hName.indexOf("timestamp") !== -1 || hName.indexOf("date") !== -1 || hName.indexOf("तारीख") !== -1 || hName.indexOf("time") !== -1) {
            timeColIdx = h + 1;
          }
        }

        var maxColToFetch = Math.max(contactColIdx, timeColIdx);
        var values = sheet.getRange(2, 1, lastRow - 1, maxColToFetch).getValues();
        var now = new Date();
        var oneDayAgoMs = 24 * 60 * 60 * 1000;

        for (var i = values.length - 1; i >= 0; i--) {
          var rowContact = String(values[i][contactColIdx - 1] || "").replace(/\D/g, "").slice(-10);
          if (rowContact === contactNumber) {
            var rawTimeVal = values[i][timeColIdx - 1];
            var rowTime = parseLeadDate(rawTimeVal);

            // यदि पिछला सबमिशन 24 घंटे के भीतर हुआ हो
            if (!rowTime || (now.getTime() - rowTime.getTime() < oneDayAgoMs)) {
              return ContentService
                .createTextOutput(JSON.stringify({
                  status: "already_submitted",
                  message: "You have already submitted the form. Wait for 24hr to resubmit."
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

    // नई लीड शीट में दर्ज करें
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

/**
 * तारीख पार्स करने के लिए सुरक्षित हेल्पर फ़ंक्शन
 */
function parseLeadDate(val) {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  
  var d = new Date(val);
  if (!isNaN(d.getTime())) return d;

  var str = String(val).trim();
  // भारतीय तारीख प्रारूप DD/MM/YYYY या DD-MM-YYYY
  var parts = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (parts) {
    var day = parseInt(parts[1], 10);
    var month = parseInt(parts[2], 10) - 1;
    var year = parseInt(parts[3], 10);
    var dateObj = new Date(year, month, day);

    var timeMatch = str.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      var hours = parseInt(timeMatch[1], 10);
      var mins = parseInt(timeMatch[2], 10);
      var secs = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
      var ampm = timeMatch[4] ? timeMatch[4].toLowerCase() : null;
      if (ampm === "pm" && hours < 12) hours += 12;
      if (ampm === "am" && hours === 12) hours = 0;
      dateObj.setHours(hours, mins, secs);
    }
    if (!isNaN(dateObj.getTime())) return dateObj;
  }
  return null;
}

// यह जांचने के लिए कि URL ब्राउज़र में सही चल रहा है
function doGet(e) {
  if (e && e.parameter && e.parameter.checkContact) {
    var contactToCheck = String(e.parameter.checkContact).replace(/\D/g, "").slice(-10);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var lastRow = sheet.getLastRow();
    var isDuplicate = false;

    if (contactToCheck.length === 10 && lastRow > 1) {
      var values = sheet.getRange(2, 1, lastRow - 1, Math.min(sheet.getLastColumn(), 5)).getValues();
      var now = new Date();
      var oneDayAgoMs = 24 * 60 * 60 * 1000;

      for (var i = values.length - 1; i >= 0; i--) {
        var rowContact = String(values[i][3] || "").replace(/\D/g, "").slice(-10);
        if (rowContact === contactToCheck) {
          var rowTime = parseLeadDate(values[i][0]);
          if (!rowTime || (now.getTime() - rowTime.getTime() < oneDayAgoMs)) {
            isDuplicate = true;
            break;
          }
        }
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        contact: contactToCheck,
        isDuplicate: isDuplicate,
        message: isDuplicate ? "You have already submitted the form. Wait for 24hr to resubmit." : "Available"
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput("🌿 Madhavbaug Livo Shots (Liver Care) Webhook is Live and Active!");
}
