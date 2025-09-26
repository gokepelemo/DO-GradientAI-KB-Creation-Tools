#!/bin/bash

# KB Tools CLI Completion
# Add this to your shell profile: source kb-completion.sh

_kb_tools_completion() {
    local cur prev opts
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"

    # Main commands
    local commands="github stackoverflow reddit intercom process upload help version"

    # GitHub subcommands
    local github_opts="--repo --owner --token --output --dry-run --help"

    # Stack Overflow subcommands
    local stackoverflow_opts="--query --sort --order --pagesize --output --dry-run --help"

    # Reddit subcommands
    local reddit_opts="--subreddit --query --limit --output --dry-run --help"

    # Intercom subcommands
    local intercom_opts="--workspace --token --output --dry-run --help"

    # Process subcommands
    local process_opts="--input --output --format --dry-run --help"

    # Upload subcommands
    local upload_opts="--file --bucket --region --endpoint --access-key --secret-key --dry-run --help"

    case "${prev}" in
        kb|kbtools|kbcreationtools)
            COMPREPLY=( $(compgen -W "${commands}" -- ${cur}) )
            return 0
            ;;
        github)
            COMPREPLY=( $(compgen -W "${github_opts}" -- ${cur}) )
            return 0
            ;;
        stackoverflow)
            COMPREPLY=( $(compgen -W "${stackoverflow_opts}" -- ${cur}) )
            return 0
            ;;
        reddit)
            COMPREPLY=( $(compgen -W "${reddit_opts}" -- ${cur}) )
            return 0
            ;;
        intercom)
            COMPREPLY=( $(compgen -W "${intercom_opts}" -- ${cur}) )
            return 0
            ;;
        process)
            COMPREPLY=( $(compgen -W "${process_opts}" -- ${cur}) )
            return 0
            ;;
        upload)
            COMPREPLY=( $(compgen -W "${upload_opts}" -- ${cur}) )
            return 0
            ;;
        --repo|--owner|--subreddit|--workspace|--input|--file|--bucket|--region|--endpoint|--access-key|--secret-key)
            # File/directory completion for these options
            COMPREPLY=( $(compgen -f -- ${cur}) )
            return 0
            ;;
        --output)
            # File completion for output
            COMPREPLY=( $(compgen -f -- ${cur}) )
            return 0
            ;;
        --query|--sort|--order|--pagesize|--limit|--format)
            # No completion for these
            return 0
            ;;
        --token)
            # No completion for tokens
            return 0
            ;;
        *)
            ;;
    esac
}

# Register completion functions
complete -F _kb_tools_completion kb
complete -F _kb_tools_completion kbtools
complete -F _kb_tools_completion kbcreationtools