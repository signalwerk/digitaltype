#!/bin/bash

mkdir packages
git submodule add git@github.com:signalwerk/signalwerk.md.git "./packages/signalwerk.md"
git submodule add git@github.com:signalwerk/signalwerk.cms.git "./packages/signalwerk.cms"

cp ./packages/signalwerk.cms/cms.config.jsx .
cp ./packages/signalwerk.cms/vite.config.js .
cp ./packages/signalwerk.cms/package.json . 
cp ./packages/signalwerk.cms/.gitignore . 
cp ./packages/signalwerk.cms/index.html . 

mkdir pages
