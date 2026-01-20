#!/usr/bin/env python3
"""
Reddit Post Collector using PRAW
Collects new posts from target subreddits and saves to JSON files.

Usage:
    python3 scripts/collect-reddit-posts.py
    
Environment variables required:
    REDDIT_CLIENT_ID
    REDDIT_CLIENT_SECRET
    
Optional:
    REDDIT_USER_AGENT (default: "RedditMonitor/1.0")
"""

import praw
import json
import os
from datetime import datetime
from pathlib import Path

# Configuration
SUBREDDITS = [
    "indiehackers",
    "SideProject", 
    "microsaas",
    "buildinpublic",
    "vibecoding",
    "SaaS",
    "Entrepreneurs",
    "Startups",
]

POSTS_PER_SUBREDDIT = 25
OUTPUT_DIR = Path("collected-data")


def get_reddit_client():
    """Initialize PRAW Reddit client."""
    client_id = os.environ.get("REDDIT_CLIENT_ID")
    client_secret = os.environ.get("REDDIT_CLIENT_SECRET")
    user_agent = os.environ.get("REDDIT_USER_AGENT", "RedditMonitor/1.0")
    
    if not client_id or not client_secret:
        raise ValueError(
            "Missing Reddit API credentials. Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET environment variables.\n"
            "Get credentials at: https://www.reddit.com/prefs/apps"
        )
    
    return praw.Reddit(
        client_id=client_id,
        client_secret=client_secret,
        user_agent=user_agent,
    )


def collect_posts(reddit, subreddit_name: str, limit: int = 25) -> list:
    """Collect new posts from a subreddit."""
    posts = []
    
    try:
        subreddit = reddit.subreddit(subreddit_name)
        
        for submission in subreddit.new(limit=limit):
            posts.append({
                "id": submission.id,
                "title": submission.title,
                "selftext": submission.selftext,
                "author": str(submission.author) if submission.author else "[deleted]",
                "score": submission.score,
                "upvote_ratio": submission.upvote_ratio,
                "created_utc": submission.created_utc,
                "num_comments": submission.num_comments,
                "permalink": f"https://reddit.com{submission.permalink}",
                "url": submission.url,
                "is_self": submission.is_self,
                "link_flair_text": submission.link_flair_text,
                "subreddit": subreddit_name,
                "collected_at": datetime.utcnow().isoformat(),
            })
            
    except Exception as e:
        print(f"  ⚠️  Error collecting from r/{subreddit_name}: {e}")
        
    return posts


def save_posts(posts: list, subreddit_name: str):
    """Save posts to JSON file."""
    OUTPUT_DIR.mkdir(exist_ok=True)
    
    output_file = OUTPUT_DIR / f"reddit-{subreddit_name}.json"
    
    with open(output_file, "w") as f:
        json.dump(posts, f, indent=2)
        
    return output_file


def main():
    print("🔍 Reddit Post Collector")
    print("=" * 50)
    
    reddit = get_reddit_client()
    print(f"✓ Connected to Reddit API\n")
    
    total_posts = 0
    
    for subreddit_name in SUBREDDITS:
        print(f"📥 Collecting from r/{subreddit_name}...", end=" ")
        
        posts = collect_posts(reddit, subreddit_name, POSTS_PER_SUBREDDIT)
        
        if posts:
            output_file = save_posts(posts, subreddit_name)
            print(f"✓ {len(posts)} posts → {output_file}")
            total_posts += len(posts)
        else:
            print("⚠️  No posts collected")
    
    print("\n" + "=" * 50)
    print(f"✅ Done! Collected {total_posts} posts from {len(SUBREDDITS)} subreddits")
    print(f"📁 Output directory: {OUTPUT_DIR.absolute()}")


if __name__ == "__main__":
    main()
