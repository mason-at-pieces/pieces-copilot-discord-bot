import {env} from "../env.js";
import {Octokit} from "octokit";

const octokit = new Octokit({ auth: env.GITHUB_PERSONAL_TOKEN });

export const getIssues = async (owner: string, repo: string) => {
  try {
    const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
      owner,
      repo,
      state: 'closed',
      per_page: 100
    })

    const cleanedIssues = await Promise.all(issues.map(async (issue) => {
      const comments = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: issue.number
      })

      const cleanedComments = comments.data.map((comment) => ({
        // createdAt: comment.created_at,
        body: comment.body,
        // url: comment.html_url,
        // user: comment.user.login
      }))

      return {
        // title: issue.title,
        // user: issue.user.login,
        // createdAt: issue.created_at,
        body: issue.body,
        // number: issue.number,
        // url: issue.html_url,
        // labels: issue.labels.map((label) => label.name),
        // comments: cleanedComments
      }
    }))

    return cleanedIssues;
  } catch (error) {
    console.error('Error fetching issues:', error);
    return [];
  }
}