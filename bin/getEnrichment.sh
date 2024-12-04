#!/bin/bash

curl -X GET https://9i82rka097.execute-api.us-east-1.amazonaws.com/enrichment/$1 | jq
