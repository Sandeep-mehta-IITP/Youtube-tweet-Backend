import { v2 as cloudinary } from "cloudinary";
import  fs  from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: "youtube-tweet",
      public_id: Date.now().toString(),
      use_filename: true,
      unique_filename: true,
    });

    fs.unlinkSync(localFilePath);

    //console.log("File upload on Cloudinary", response);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the locally temporaly saved file as upload operation got failed
    return null;
  }
};

export { uploadOnCloudinary };
