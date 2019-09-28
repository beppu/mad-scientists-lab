# For use in || chains,
# if the exit code is -1 to -128 (aka 255 to 128), stop the || chain .
skip_errors() {
  # process.exit(n) where n is -1 to -128 should be ignored.
  # n ==   -1 => $? == 255
  # n == -128 => $? == 128
  # where n is an 8-bit signed integer
  ec=$?
  if [ "$ec" -gt 127 ] ; then
    return 0
  else
    return 1
  fi
}

