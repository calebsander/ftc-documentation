#!/bin/bash

node download-source.js &&
node extract-source.js &&
node set-comments.js &&

#~/Android/Sdk/sources/android-23
javadoc -public -notimestamp -d docs \
	-sourcepath ~/AppData/Local/Android/sdk/sources/android-23 \
	$(find sources -name "*.java" | grep -v ShaderHelper.java | grep -v CubeMeshFragmentShader.java) #these files have unicode characters that bork Javadoc