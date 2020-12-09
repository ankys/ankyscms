# Makefile for ankyscms

.PHONY : all clean

all: ankyscms.js
	node ankyscms.js

clean:
	rm -rf www acms_cache.dat
