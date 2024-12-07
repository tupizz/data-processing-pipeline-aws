#!/bin/bash

curl -X GET https://z1yrl80omf.execute-api.us-east-1.amazonaws.com/enrichment/$1 | jq
