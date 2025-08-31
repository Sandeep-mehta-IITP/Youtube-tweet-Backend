import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin: process.env.ORIGIN_CORS,
    credentials: true,
}));

app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({extended: true, limit: "16kb"}));
app.use(express.static("public"));
app.use(cookieParser());


// Error Handling of Express
app.use((err, req, res, next) => {
  console.error("Expree Error :", err);
  process.exit(1);
});

export { app };
