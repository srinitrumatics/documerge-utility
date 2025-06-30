const https = require("https");
var http = require("http");
var url = require("url");
const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const Stream = require("stream").Transform;
const ImageModule = require("docxtemplater-image-module");
require("dotenv").config({ path: __dirname + "/.env" });

var request = require("request");
const fsp = fs.promises;

const base64Regex = /^(?:data:)?image\/(png|jpg|jpeg|svg|svg\+xml);base64,/;

const validBase64 =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

const imageOptions = {
  getImage(tagValue, tagName) {
    console.log(tagValue, tagName);
    const base64Value = base64Parser(tagValue);
    if (base64Value) {
      return base64Value;
    }
    // tagValue is "https://docxtemplater.com/xt-pro-white.png"
    // tagName is "image"
    return new Promise(function (resolve, reject) {
      getHttpData(tagValue, function (err, data) {
        if (err) {
          return reject(err);
        }
        resolve(data);
      });
    });
  },
  getSize(img, tagValue, tagName, context) {
    console.log(tagValue, tagName);
    return [150, 150];
  },
};

async function writeDocxFile(path, content, document_id, laravelUploadUrl) {
  try {
    await fsp.writeFile(path, content);

    await mobefiletoLaravel(document_id, path, laravelUploadUrl);
    console.log("Successfully_Rendered!");
  } catch (err) {
    console.log(err);
  }
}

async function mobefiletoLaravel(document_id, storeFilepath, laravelUploadUrl) {
  // var laravelUploadUrl = process.env.EMBEDDED_APP_URL + "/getDocSignTemplate";
  console.log("laravelUploadUrl!", laravelUploadUrl);

  var req = request.post(laravelUploadUrl, function (err, resp, body) {
    //  console.log('Successfully_Uploaded------------!', resp);
    if (err) {
      console.log("Error!", err);
    } else {
      //  console.log('resp!', resp);
      console.log("Successfully_Uploaded------------!");
      //  doc_message = 'Successfully_Uploaded';
    }
  });

  try {
    var form = req.form();
    form.append("file", fs.createReadStream(storeFilepath));
    form.append("document_id", document_id);
  } catch (err) {
    console.log(err);
  }
}

function base64Parser(tagValue) {
  if (typeof tagValue !== "string" || !base64Regex.test(tagValue)) {
    return false;
  }

  const stringBase64 = tagValue.replace(base64Regex, "");

  if (!validBase64.test(stringBase64)) {
    throw new Error(
      "Error parsing base64 data, your data contains invalid characters"
    );
  }

  // For nodejs, return a Buffer
  if (typeof Buffer !== "undefined" && Buffer.from) {
    return Buffer.from(stringBase64, "base64");
  }

  // For browsers, return a string (of binary content) :
  const binaryString = window.atob(stringBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    const ascii = binaryString.charCodeAt(i);
    bytes[i] = ascii;
  }
  return bytes.buffer;
}

// Returns a Promise<Buffer> of the image
function getHttpData(url, callback) {
  (url.substr(0, 5) === "https" ? https : http)
    .request(url, function (response) {
      if (response.statusCode !== 200) {
        return callback(
          new Error(
            `Request to ${url} failed, status code: ${response.statusCode}`
          )
        );
      }

      const data = new Stream();
      response.on("data", function (chunk) {
        data.push(chunk);
      });
      response.on("end", function () {
        callback(null, data.read());
      });
      response.on("error", function (e) {
        callback(e);
      });
    })
    .end();
}

function generateDocumnet(
  documentFile,
  documentJsonFile,
  save_file_name,
  document_id,
  app_url
) {
  //   console.log('generateDocumnet', documentFile, documentJsonFile, save_file_name);
  var doc_message = "";
  var content = null;
  var replaceContent = null;
  var replaceDocSignData = null;

  if (documentFile && documentJsonFile) {
    let contentExists = false;
    try {
      //   console.log('documentFile', 'uploads/' + documentFile);
      content = fs.readFileSync("uploads/" + documentFile);
      replaceContent = documentJsonFile;
      contentExists = true;
    } catch (error) {
      console.error(
        "An error occurred while reading doc template file operations:",
        documentFile
      );

      doc_message =
        "An error occurred while reading doc template file operations:" +
        documentFile;
    }
    console.log("contentExists", contentExists);
    if (contentExists) {
      // Unzip the content of the file
      const zip = new PizZip(content);

      const doc = new Docxtemplater(zip, {
        modules: [new ImageModule(imageOptions)],
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: "{{", end: "}}" },
      });

      replaceDocSignData = JSON.parse(replaceContent);
      var storeFilepath = "uploads/" + save_file_name + ".docx";
      var laravelUploadUrl = app_url + "/getDocSignTemplate";

      console.log("getDocSignTemplate!", storeFilepath);

      var rendered = "no";

      doc
        .renderAsync(replaceDocSignData)
        .then(function () {
          const buffer = doc.getZip().generate({
            type: "nodebuffer",
            compression: "DEFLATE",
          });

          //  fsp.writeFileSync(storeFilepath, buffer);
          writeDocxFile(storeFilepath, buffer, document_id, laravelUploadUrl);
          rendered = "yes";
          doc_message = "Successfully_Uploaded";
        })
        .catch(function (error) {
          doc_message =
            "An error occurred while performing  docx template pharsing:" +
            documentFile;
          console.error(
            "An error occurred while performing  docx template pharsing",
            error
          );
        });
    }
  }

  return doc_message;
}

module.exports = generateDocumnet;
