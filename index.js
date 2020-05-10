const core = require("@actions/core");
const path = require("path");
const fs = require("fs");
const https = require("https");
const { exec } = require("child_process");

const antlr_tool = path.resolve("antlr.jar");
const temp_antlr_source = path.resolve("antlr_source_tmp");

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

            console.log(stdout);

            return res();
        });
    });
};

const install_jdk = async () => {
    console.log("installing jdk");

    // await run("cd /var/lib/dpkg/info && sudo rm *.postinst");
    // await run("sudo apt-get update");

    // await run("sudo apt-get --force-yes install openjdk-8-jre-headless");

    // await run("JAVA_HOME=\"/usr/lib/jvm/java-8-openjdk-amd64\"");
    // await run("source /etc/environment");

    // await run("echo $JAVA_HOME");
    // await run("java --version");

    await run(`#!/bin/bash
        cd /var/lib/dpkg/info
        sudo rm *.postinst
        cd ~/
        sudo apt-get update
        sudo apt-get --force-yes install openjdk-8-jre-headless
        JAVA_HOME="/usr/lib/jvm/java-8-openjdk-amd64"
        source /etc/environment
        echo $JAVA_HOME
        java --version
    `);
};

const download_antlr_tool = async () => {
    console.log("downloading ANTLR Tool");

    await new Promise((res, rej) => {
        const file = fs.createWriteStream(antlr_tool);

        https.get("https://www.antlr.org/download/antlr-4.8-complete.jar", response => {
            console.log("downloading...");

            response.pipe(file);

            file.on("finish", () => {
                console.log("downloaded");

                file.close();
                res();
            });
        }).on("error", error => {
            fs.unlink(antlr_tool);

            rej(error);
        });
    });
};

const create_source_file_folder = async () => {
    console.log("create source file folder");

    await new Promise((res, rej) => {
        fs.mkdir(temp_antlr_source, error => {
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

const workspace = get_workspace_path();

const copy_source_files = async () => {
    console.log("copying source files");

    for (const file of inputs.grammar_files) {
        fs.copyFileSync(
            path.join(workspace, file),
            path.join(temp_antlr_source, path.basename(file))
        );
    }

    await Promise.resolve();
};

const generate_source_codes = async () => {
    console.log("generating source codes");

    const output = path.join(workspace, inputs.output);
    const entry = path.join(temp_antlr_source, inputs.main_grammar);

    if (!fs.existsSync(output))
        fs.mkdirSync(output);

    await run(
        `java -Xmx500M -cp '${antlr_tool}:$CLASSPATH' org.antlr.v4.Tool -Dlanguage=${inputs.language} -o '${output}' '${entry}'`
    );
}

const clean_up_source_folder = async () => {
    console.log("clean up source folder");

    await new Promise((res, rej) => {
        fs.rmdir(temp_antlr_source, { recursive: true }, error => {
            if (error)
                return rej(error);

            return res();
        });
    });
}

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
