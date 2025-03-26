import express from "express"
import cors from "cors"
import { exec } from "child_process"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const app = express()
app.use(cors())
app.use(express.json())

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Convert Windows paths to Docker-compatible format
const convertPathForDocker = (windowsPath) => {
    return windowsPath.replace(/\\/g, "/").replace(/^([a-zA-Z]):/, (_, drive) => `/${drive.toLowerCase()}`)
}

// Function to execute code
const executeCode = (language, code, res) => {
    const timestamp = Date.now()
    let filename, dockerCommand
    const dockerPath = convertPathForDocker(__dirname)

    if (language === "python") {
        filename = `temp_${timestamp}.py`
        dockerCommand = `docker run --rm -v "${dockerPath}:/app" python:3.9 python /app/${filename}`
    } else if (language === "java") {
        filename = `Main.java`
        dockerCommand = `docker run --rm -v "${dockerPath}:/app" openjdk:17 sh -c "javac /app/Main.java && java -cp /app Main && rm -f /app/Main.java /app/Main.class"`
    } else if (language === "cpp") {
        filename = `program_${timestamp}.cpp`
        dockerCommand = `docker run --rm -v "${dockerPath}:/app" gcc:latest sh -c "g++ /app/${filename} -o /app/program_${timestamp} && /app/program_${timestamp}"`
    } else {
        return res.status(400).json({ error: "Unsupported language" })
    }

    fs.writeFile(path.join(__dirname, filename), code, (err) => {
        if (err) {
            return res.status(500).json({ error: "Failed to save code file" })
        }

        exec(dockerCommand, (error, stdout, stderr) => {
            fs.unlink(path.join(__dirname, filename), () => {})

            if (error) {
                return res.json({ error: stderr || error.message })
            }
            res.json({ output: stdout })
        })
    })
}

// API Route
app.post("/execute", (req, res) => {
    const { language, code } = req.body
    executeCode(language, code, res)
})

app.listen(8080, () => console.log("Code execution service running on port 8080"))
