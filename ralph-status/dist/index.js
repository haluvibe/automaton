import { glob } from "glob";
import { readFileSync, existsSync } from "fs";
import { parse } from "yaml";
import { resolve, dirname } from "path";
function parseRalphLoopFile(filePath) {
    try {
        const content = readFileSync(filePath, "utf-8");
        // Extract YAML frontmatter between --- markers
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        if (!match)
            return null;
        return parse(match[1]);
    }
    catch {
        return null;
    }
}
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleString();
}
function formatDuration(startDate) {
    const start = new Date(startDate);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0)
        return `${diffDays}d ${diffHours % 24}h ago`;
    if (diffHours > 0)
        return `${diffHours}h ${diffMins % 60}m ago`;
    return `${diffMins}m ago`;
}
async function main() {
    // Find the parent directory (where cic-* folders are)
    const scriptDir = dirname(new URL(import.meta.url).pathname);
    const parentDir = resolve(scriptDir, "../..");
    // Find all cic-* directories
    const cicFolders = await glob("cic-*/", { cwd: parentDir });
    if (cicFolders.length === 0) {
        console.log("No cic-* folders found in", parentDir);
        return;
    }
    const statuses = [];
    for (const folder of cicFolders) {
        const folderName = folder.replace(/\/$/, "");
        const ralphLoopPath = resolve(parentDir, folder, ".claude/ralph-loop.local.md");
        if (!existsSync(ralphLoopPath)) {
            statuses.push({ folder: folderName, status: "not_started" });
            continue;
        }
        const state = parseRalphLoopFile(ralphLoopPath);
        if (!state) {
            statuses.push({ folder: folderName, status: "not_started" });
            continue;
        }
        statuses.push({
            folder: folderName,
            status: state.active ? "needs_input" : "completed",
            iteration: state.iteration,
            startedAt: state.started_at ? new Date(state.started_at) : undefined,
        });
    }
    // Display output
    console.log("\n  Ralph Loop Status");
    console.log("  " + "─".repeat(45));
    for (const status of statuses) {
        console.log();
        console.log(`  📁 ${status.folder}`);
        switch (status.status) {
            case "needs_input":
                console.log(`     Status: 🟡 NEEDS INPUT`);
                if (status.iteration !== undefined) {
                    console.log(`     Iteration: ${status.iteration}`);
                }
                if (status.startedAt) {
                    const state = parseRalphLoopFile(resolve(parentDir, status.folder, ".claude/ralph-loop.local.md"));
                    if (state?.started_at) {
                        console.log(`     Started: ${formatDate(state.started_at)} (${formatDuration(state.started_at)})`);
                    }
                }
                break;
            case "completed":
                console.log(`     Status: 🟢 COMPLETED`);
                if (status.iteration !== undefined) {
                    console.log(`     Iterations: ${status.iteration}`);
                }
                break;
            case "not_started":
                console.log(`     Status: ⚪ NOT STARTED`);
                break;
        }
    }
    console.log();
    console.log("  " + "─".repeat(45));
    // Summary
    const needsInput = statuses.filter((s) => s.status === "needs_input").length;
    const completed = statuses.filter((s) => s.status === "completed").length;
    const notStarted = statuses.filter((s) => s.status === "not_started").length;
    console.log(`  Summary: ${needsInput} needs input, ${completed} completed, ${notStarted} not started`);
    console.log();
}
main().catch(console.error);
