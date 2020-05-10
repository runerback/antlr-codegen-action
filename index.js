const core = require("@actions/core");
const path = require("path");
const fs = require("fs");
const https = require("https");
const { exec } = require("child_process");

const inputs = {
    language: core.getInput("language"),
    output: core.getInput("output"),
    grammar_files: core.getInput("grammar-files").split(","),
    main_grammar: core.getInput("main-grammar")
};

const run = command => {
    console.log(`[bash] ${command}`);

    return new Promise((res, rej) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                return rej(error.message);
            }

            if (stderr) {
                return rej(stderr);
            }

            return res(stdout);
        });
    });
};

const install_jdk = async () => {
    console.log("installing jdk");

    await run("sudo apt-get update");
    await run("sudo apt-get install openjdk-8-jre");
};

const download_antlr_tool = async () => {
    console.log("downloading ANTLR Tool");

    const dest = path.resolve("antlr.jar");

    await new Promise((res, rej) => {
        const file = fs.createWriteStream(dest);

        https.get("https://www.antlr.org/download/antlr-4.8-complete.jar", res => {
            res.pipe(file);
        }).on("error", error => {
            fs.unlink(dest);

            rej(error);
        });

        file.on("finish", () => {
            file.close();

            res();
        });
    });
};

const create_source_file_folder = async () => {
    console.log("create source file folder");

    await new Promise((res, rej) => {
        fs.mkdir("source", error => {
            if (error)
                return rej(error);

            return res();
        });
    });
};

const get_workspace_path = () => {
    let githubWorkspacePath = process.env["GITHUB_WORKSPACE"];
    if (!githubWorkspacePath) {
        throw new Error("GITHUB_WORKSPACE not defined");
    }
    return path.resolve(githubWorkspacePath);
};

const copy_source_files = async () => {
    console.log("copying source files");

    for (const file of inputs.grammar_files) {
        fs.copyFileSync(
            path.join(workspace, file),
            path.join("./source", path.basename(file))
        );
    }

    await Promise.resolve();
};

const generate_source_codes = async () => {
    console.log("generating source codes");

    const tool = path.resolve("antlr.jar");
    const output = path.join(workspace, inputs.output);
    const entry = path.join(workspace, inputs.main_grammar);

    await run(
        `java -Xmx500M -cp "${tool}:$CLASSPATH" org.antlr.v4.Tool -Dlanguage=${inputs.language} -o ${output} ${entry}`
    );
}

const clean_up_source_folder = async () => {
    console.log("clean up source folder");

    await new Promise((res, rej) => {
        fs.rmdir("source", { recursive: true }, error => {
            if (error)
                return rej(error);

            return res();
        });
    });
}

const workspace = get_workspace_path();

const start = async () => {
    await install_jdk();
    await download_antlr_tool();
    await create_source_file_folder();
    await copy_source_files();
    await generate_source_codes();
    await clean_up_source_folder();
};

start()
    .then(() => {
        core.setOutput("output", path.resolve(inputs.output));
    })
    .catch(error => {
        core.setFailed(error);
    });
