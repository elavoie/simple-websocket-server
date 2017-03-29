#!/usr/bin/env python
import execo
import execo_g5k
import argparse

parser = argparse.ArgumentParser(
        description='Run the spawn-node/volunteer test on Grid5000')
parser.add_argument(
        'volunteers',
        metavar='N',
        type=int,
        help='number of volunteer nodes to use (8 cores per node)',
        default=1)
parser.add_argument(
        'host',
        type=str,
        help='host to connect to',
        default='localhost:5000')
parser.add_argument(
        'nb_tabs',
        type=int,
        help='number of browser tabs to open on each core',
        default=1)

args = parser.parse_args()

nb_nodes = (args.volunteers)
print 'Submitting job request for %i nodes (%i cores)' % (nb_nodes, nb_nodes*8)
[(jobid, site)] = execo_g5k.oarsub([
    (execo_g5k.OarSubmission(
        resources="nodes=%i" % nb_nodes,
        job_type="allow_classic_ssh"),
        "grenoble")
])


workers_cmd = 'node simple-websocket-server/bin/client.js %s' % \
               (args.host) 


params = execo_g5k.default_oarsh_oarcp_params

if jobid:
    try:
        print 'Waiting for job to start'
        execo_g5k.wait_oar_job_start(jobid, site)
        print 'Retrieving nodes'
        nodes = execo_g5k.get_oar_job_nodes(jobid, site)
        # Open one connection per core (there are 8 cores per node in grenoble)
        cores = nodes * 8 * args.nb_tabs
        print cores
        print 'Starting %d workers with cmd: %s'%(len(cores),workers_cmd)
        workers = execo.Remote(
                workers_cmd,
                cores).start()
        execo.sleep(600)
        print 'Workers done'

    finally:
        execo_g5k.oardel([(jobid, site)])
