const express = require("express");
const app = express();
//const port = 3000
const PORT = process.env.PORT || 3000; // Default to 3000 if PORT is not set

const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: __dirname + "/.env" });

var request = require("request");

const fsp = fs.promises;

const multer = require("multer");
const upload = multer({ dest: "uploads/" });

console.log("__dirname", __dirname);
console.log("__dirname", __dirname + "/services/docxConversionService");
const generateDocumnet = require(__dirname + "/services/docxConversionService");

app.get("/test", (req, res) => {
  const password = generateDocumnet("t1.docx", "t1.json", "tt");
  console.log(password);
  res.send("success");
});

app.get("/", (req, res) => {
  res.send("success");
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const uploadStorage = multer({ storage: storage });

app.post(
  "/upload_file",
  uploadStorage.single("file"),
  function (req, res, next) {
    var upload_msg = "";

    var reqbody = req.body;
    // req.file is the `avatar` file
    // req.body will hold the text fields, if there were any
    try {
      var cn = null;
      var uploadfile = req.file;

      if ((cn = fs.readFileSync("uploads/" + uploadfile.originalname))) {
        const docResult = generateDocumnet(
          uploadfile.originalname,
          reqbody.template,
          reqbody.document_file_name,
          reqbody.document_id,
          reqbody.app_url
        );
      }
      // handle success
      upload_msg = "Successfully_Uploaded";
    } catch (error) {
      // handle error
      // return res.status(400).json({ message: error.message });
      upload_msg = "failed";
    }

    return res.send(upload_msg);
  }
);

// Recursive function to get files
function getFiles(dir) {
  let fileList = [];
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      fileList = listFilesRecursively(path.join(dir, file), fileList);
    } else {
      fileList.push(path.join(dir, file));
    }
  });

  return fileList;
}

function deleteDileFromPath(filePath) {
  try {
    // Remove the file
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Error removing file: ${err}`);
        return;
      }

      console.log(`File ${filePath} has been successfully removed.`);
    });
  } catch (err) {
    console.log(err);
  }
}
function deleteFilesInDirectory(dir) {
  let fileList = [];
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      fileList = listFilesRecursively(path.join(dir, file), fileList);
    } else {
      fileList.push(path.join(dir, file));
      deleteDileFromPath(path.join(dir, file));
    }
  });

  return fileList;
}

app.get("/list_files", (req, res) => {
  const filesInTheFolder = getFiles("./uploads");
  //console.log('filesInTheFolder', filesInTheFolder);
  res.send(filesInTheFolder);
});

app.get("/remove_file", (req, res) => {
  console.log("------------file---------------------------", req.query.file);

  const filePath = "./uploads/" + req.query.file; // Replace with the actual path to your file
  deleteDileFromPath(filePath);
  res.send("deleted");
});
app.get("/remove_all_files", (req, res) => {
  const filePath = "./uploads";
  deleteFilesInDirectory(filePath);
  res.send("deleted");
});

app.listen(PORT, () => {
  console.log(`Embedded node app listening on port ${PORT}`);
});
