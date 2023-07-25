from argparse import ArgumentParser
from main import process_video

parser = ArgumentParser()
parser.add_argument("-id", required=True)
parser.add_argument("-vf", "--video-file")

args = vars(parser.parse_args())

if args["video_file"]:
    process_video(args["id"], args["video_file"])
