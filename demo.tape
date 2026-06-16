# Crosshair demo — regenerate with: vhs demo.tape
Output demo.gif

Set Shell "bash"
Set FontSize 18
Set Width 1100
Set Height 640
Set Padding 16
Set TypingSpeed 60ms
Set PlaybackSpeed 1.0

Hide
Type "ROOT=$PWD" Enter
Type 'crosshair() { node "$ROOT/packages/cli/dist/bin.js" "$@"; }' Enter
Type "cd .scratch/demo" Enter
Type `sed -i '' 's/mockReply: { tool: "read_text_file" }/mockReply: { tool: "directory_tree" }/' crosshair.config.ts` Enter
Type "clear" Enter
Sleep 500ms
Show

# 1. Lint — the hook (npx launch is the only slow step)
Type "crosshair lint -- npx -y @modelcontextprotocol/server-filesystem /tmp" Enter
Sleep 5s

# 2. Run — one case fails with a diff
Type "crosshair run --adapter mock --no-cache" Enter
Sleep 3s

# 3. Fix the rigged case (red -> green)
Type `sed -i '' 's/mockReply: { tool: "directory_tree" }/mockReply: { tool: "read_text_file" }/' crosshair.config.ts` Enter
Sleep 1s

# 4. Run again — now green
Type "crosshair run --adapter mock --no-cache" Enter
Sleep 3s