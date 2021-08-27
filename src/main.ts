import core from "@actions/core";
import github from "@actions/github";
import { inspect } from "util";

main();

async function main() {
  try {
    assertenv("GITHUB_TOKEN");

    const octokit = github.getOctokit(process.env.GITHUB_TOKEN as string);
    const { owner, repo } = github.context.repo;

    const inputs = {
      title: core.getInput("title"),
      body: core.getInput("body"),
      head: core.getInput("head").replace(/^refs\/heads\//, ""),
      base: core.getInput("base").replace(/^refs\/heads\//, ""),
      label: core.getInput("label", { required: true }) as string,
      draft: core.getInput("draft") === "true",
    };

    core.debug(`Inputs: ${inspect(inputs)}`);

    const { data, error } = await findPullRequest(octokit, owner, repo, inputs.head, inputs.base, inputs.label);

    core.info(error
      ? "Didn't find existing pull request, creating new."
      : "Found existing pull request, updating");

    if (error) {
      /** Only create if there is any changes */
      const { data: compare } = await octokit.rest.repos.compareCommitsWithBasehead({
        owner,
        repo,
        basehead: `${inputs.base}...${inputs.head}`,
      });

      if (compare.total_commits <= 0) {
        core.setFailed("No commits between base and head, cancelling operation");
        return;
      }

      core.debug("Creating pull request");

      /** Create pull request */
      const result = await octokit.rest.pulls.create({
        owner,
        repo,
        title: inputs.title,
        body: inputs.body,
        head: inputs.head,
        base: inputs.base,
        draft: inputs.draft,
      });

      data.id = result.data.id;
      data.number = result.data.number;

      core.debug("Adding label to pull request");

      /** Add label */
      await octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: data.number,
        labels: [inputs.label.trim()],
      });

    } else {
      core.debug("Updating pull request");

      /** Update existing pull request */
      await octokit.rest.pulls.update({
        owner,
        repo,
        pull_number: data.number as number,
        title: inputs.title,
        body: inputs.body,
      });
    }

    core.setOutput("id", data.id);
    core.setOutput("number", data.number);
  } catch (error) {
    core.info(inspect(error));
    core.setFailed((error as Error)?.message);
  }
}

function assertenv(...variables: string[]) {
  let failed = false;
  variables.forEach(v => {
    if (process.env[v] == undefined) {
      failed = true;
      core.setFailed(`${v} is not configured. Make sure you made it available to your action`);
    }
  });
  return failed;
}


async function findPullRequest(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string, repo: string,
  head: string, base: string,
  label: string) {
  const q = `repo:${repo} is:pr is:open head:${head} base:${base} label:"${label}"`;

  core.info(`Search query: ${q}`);
  const { data } = await octokit.rest.search.issuesAndPullRequests({ q });

  if (data.total_count <= 0) {
    /** Check if a singleton PR was merged with this commit */
    const { data: prList } = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
      owner,
      repo,
      commit_sha: github.context.sha,
    });

    const prs = prList.filter(x =>
      x.state === "closed" &&
      x.labels.find(l => l.name === label) &&
      x.head.ref.replace(/^refs\/heads\//, "") === head &&
      x.base.ref.replace(/^refs\/heads\//, "") === base);

    return prs.length > 0 && prs[0]?.number !== undefined
      ? { data: { id: prs[0].id, number: prs[0].number }, error: false }
      : { data: { id: undefined, number: undefined }, error: true };
  }

  return {
    data: {
      id: data.items[0].id,
      number: data.items[0].number
    },
    error: false
  };
}
