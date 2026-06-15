#!/bin/bash
node server/index.js &
SERVER_PID=$!
npx expo start "$@"
kill $SERVER_PID
