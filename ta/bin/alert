#!/bin/bash

echo $(date --iso-8601=seconds) exchange="$TA_EXCHANGE" market="$TA_MARKET" "$*" >> /tmp/alert.log
curl http://localhost:5000/hooks/alert