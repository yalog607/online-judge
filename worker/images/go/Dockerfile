FROM golang:1.23-bookworm
RUN useradd -m -u 10001 sandbox
ENV CGO_ENABLED=0 GOTOOLCHAIN=local GOFLAGS=-buildvcs=false
# The sandbox runs with a read-only root filesystem, so the build cache lives in the
# mounted /sandbox directory. Pre-warm a cache here (standard library compiled once)
# and copy it in at compile time so compiling does not exceed the compile timeout.
RUN mkdir -p /opt/gocache /tmp/warm && chown sandbox /opt/gocache /tmp/warm
USER sandbox
RUN printf 'package main\nimport ("bufio";"fmt";"os";"strings";"sort";"strconv";"math";"bytes";"errors";"time")\nvar _ = []any{bufio.NewReader,fmt.Println,os.Stdin,strings.Split,sort.Ints,strconv.Itoa,math.Abs,bytes.NewBuffer,errors.New,time.Now}\nfunc main(){}\n' > /tmp/warm/main.go \
    && cd /tmp/warm && GOCACHE=/opt/gocache go build -o /tmp/warm/out main.go && rm -rf /tmp/warm
WORKDIR /sandbox
