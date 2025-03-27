import express from "express";
import cors from "cors";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

const BASE_PATH = "/app"; // Ensure files are stored inside the container

// Function to execute code
const executeCode = (language, code, res) => {
    const timestamp = Date.now();
    let filename, dockerCommand;

    if (language === "python") {
        filename = `temp_${timestamp}.py`;
        dockerCommand = `docker run --rm -v "${BASE_PATH}:/app" python:3.9 python /app/${filename}`;
    } else if (language === "java") {
        filename = `Main.java`;
        dockerCommand = `docker run --rm -v "${BASE_PATH}:/app" openjdk:17 sh -c "javac /app/Main.java && java -cp /app Main && rm -f /app/Main.java /app/Main.class"`;
    } else if (language === "cpp") {
        filename = `program_${timestamp}.cpp`;
        dockerCommand = `docker run --rm -v "${BASE_PATH}:/app" gcc:latest sh -c "g++ /app/${filename} -o /app/program_${timestamp} && /app/program_${timestamp}"`;
    } else {
        return res.status(400).json({ error: "Unsupported language" });
    }

    const filePath = path.join(BASE_PATH, filename);
    fs.writeFile(filePath, code, (err) => {
        if (err) {
            return res.status(500).json({ error: "Failed to save code file" });
        }

        exec(dockerCommand, (error, stdout, stderr) => {
            fs.unlink(filePath, () => {}); // Cleanup after execution

            if (error) {
                return res.json({ error: stderr || error.message });
            }
            res.json({ output: stdout });
        });
    });
};

// API Route
app.post("/execute", (req, res) => {
    const { language, code } = req.body;
    executeCode(language, code, res);
});

app.listen(8080, () => console.log("Code execution service running on port 8080"));
