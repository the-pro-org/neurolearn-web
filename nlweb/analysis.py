import os
import time
import shutil

import requests
import numpy as np
import nibabel as nb
from nibabel.filename_parser import splitext_addext
from nilearn.masking import compute_background_mask, _extrapolate_out_mask
from nilearn.image import resample_img
import nltools
from nltools.analysis import Predict

from .httpclient import HTTPClient, FileCache, CachedObject

BASE_NV_URL = 'http://neurovault.org'


def download(collection_id, outfolder):
    from pyneurovault import api

    # Will extract all collections and images in one query to work from
    nv = api.NeuroVault()

    # Download all images to file
    # standard = os.path.join(
    # os.path.dirname(api.__file__), 'data',
    # 'MNI152_T1_2mm_brain_mask_dil.nii.gz')

    standard = os.path.join(
        os.path.dirname(nltools.__file__), 'resources', 'MNI152_T1_2mm_brain_mask_dil.nii.gz')

    nv.download_images(dest_dir=outfolder, target=standard,
                       collection_ids=[collection_id], resample=True)

    # Create Variables
    collection_data = nv.get_images_df(
    ).ix[nv.get_images_df().collection_id == collection_id, :].reset_index()

    return collection_data


def to_filename_dict(rows):
    di = {}
    for r in rows:
        di[r['filename']] = r
    return di


def fetch_collection_images(collection_id):
    url = "%s/api/collections/%s/images/"

    r = requests.get(url % (BASE_NV_URL, collection_id))

    return r.json()


def image_id(url):
    return int(url.split("/")[-2])


def construct_local_filename(dirname, image_id, file_path):
    filename_parts = splitext_addext(file_path)
    return os.path.join(dirname,
                        "%s%s" % (image_id, ''.join(filename_parts[1:])))


def download_images(client, image_list, output_dir):
    dirname = os.path.join(output_dir, 'original')
    try:
        os.makedirs(dirname)
    except (IOError, OSError):
        pass

    image_items = []

    for image in image_list:
        imid = image_id(image['url'])
        filename = construct_local_filename(dirname, imid, image['file'])
        print "Retrieving ", image['file']
        image_items.append({
            'id': imid,
            'obj': image,
            'file': client.retrieve(image['file'], filename, force_cache=True)
        })

    return image_items


class ImageResampler(object):
    def __init__(self, cache):
        self.cache = cache

    def process(self, source_file, output_file, target_nii, cache_key):

        # XXX: Cache direct access to speed things up during development
        cached_dir = self.cache.get_dirpath(cache_key)

        if cached_dir:
            shutil.copyfile(os.path.join(cached_dir, 'data'), output_file)
            return output_file

        resampled = self._resample_image(source_file, output_file, target_nii)
        with open(resampled, 'r') as f:
            self.cache.set(cache_key, CachedObject(
                headers={},
                data=f.read()))

    def _resample_image(self, image_file, output_file, target_nii):
        # Compute the background and extrapolate outside of the mask
        print "Extrapolating %s" % image_file
        niimg = nb.load(image_file)
        affine = niimg.get_affine()
        data = niimg.get_data().squeeze()
        niimg = nb.Nifti1Image(data, affine, header=niimg.get_header())
        bg_mask = compute_background_mask(niimg).get_data()

        # Test if the image has been masked:
        out_of_mask = data[np.logical_not(bg_mask)]
        if np.all(np.isnan(out_of_mask)) or len(np.unique(out_of_mask)) == 1:
            # Need to extrapolate
            data = _extrapolate_out_mask(data.astype(np.float),
                                         bg_mask, iterations=3)[0]
        niimg = nb.Nifti1Image(data, affine, header=niimg.get_header())
        del out_of_mask, bg_mask

        print "Resampling %s" % image_file
        resampled_nii = resample_img(
            niimg, target_nii.get_affine(), target_nii.shape)
        resampled_nii = nb.Nifti1Image(resampled_nii.get_data().squeeze(),
                                       resampled_nii.get_affine(),
                                       header=niimg.get_header())
        if len(resampled_nii.shape) == 3:
            resampled_nii.to_filename(output_file)
        else:
            # We have a 4D file
            raise Exception('4D File.')
            # assert len(resampled_nii.shape) == 4
            # resampled_data = resampled_nii.get_data()
            # affine = resampled_nii.get_affine()
            # for index in range(resampled_nii.shape[-1]):
            #     # First save the files separately
            #     this_nii = nb.Nifti1Image(resampled_data[..., index], affine)
            #     this_id = int("%i%i" % (-row[1]['image_id'], index))
            #     this_file = os.path.join(output_dir, "%06d%s" % (this_id, ext))
            #     this_nii.to_filename(this_file)
            #     # Second, fix the dataframe
            #     out_df = out_df[out_df.image_id != row[1]['image_id']]
            #     this_row = row[1].copy()
            #     this_row.image_id = this_id
            #     out_df = out_df.append(this_row)
        return output_file


def resample_images(image_list, output_dir):
    dirname = os.path.join(output_dir, 'resampled')
    target_nii_filename = 'MNI152_T1_2mm_brain_mask_dil.nii.gz'
    standard = os.path.join(
        os.path.dirname(nltools.__file__), 'resources',
        target_nii_filename)

    target_nii = nb.load(standard)

    try:
        os.makedirs(dirname)
    except (IOError, OSError):
        pass

    resampler = ImageResampler(cache=FileCache('cache'))

    for item in image_list:
        filename = os.path.join(dirname, os.path.basename(item['file']))
        key = 'resample://images/{image_id}/?target={target_nii}'.format(
            image_id=item['id'],
            target_nii=target_nii_filename
        )
        print "Getting Resampled Image for ", filename

        resampler.process(item['file'], filename, target_nii=target_nii,
                          cache_key=key)


def run_ml_analysis2(data, collection_id, algorithm, output_dir):
    tic = time.time()  # Start Timer

    client = HTTPClient(cache=FileCache('cache'))

    image_list = fetch_collection_images(collection_id)
    image_list = download_images(client, image_list['results'],
                                 output_dir)
    resample_images(image_list, output_dir)

    print 'Elapsed: %.2f seconds' % (time.time() - tic)  # Stop timer
    tic = time.time()  # Start Timer


def run_ml_analysis(data, collection_id, algorithm, outfolder):
    print data

    tic = time.time()  # Start Timer

    collection_data = download(collection_id, outfolder)

    print 'Elapsed: %.2f seconds' % (time.time() - tic)  # Stop timer
    tic = time.time()  # Start Timer

    img_index = sorted((e, i) for i, e in enumerate(collection_data.file))

    index = [x[1] for x in img_index]
    img_file = [x[0] for x in img_index]

    dat = nb.funcs.concat_images([os.path.join(outfolder, 'resampled', '00' + str(
        x) + '.nii.gz') for x in collection_data.image_id[index]])

    # holdout = [int(x.split('_')[-2]) for x in img_file]
    # XXX: use index as subject_id for a while:
    holdout = index

    # heat_level = [x.split('_')[-1].split('.')[0] for x in img_file]

    filename_dict = to_filename_dict(data)

    Y_list = []
    for x in img_file:
        basename = os.path.basename(x)
        Y_list.append(int(filename_dict[basename]['target']))

    # Y_dict = {'High': 3, 'Medium': 2, 'Low': 1}
    # Y = np.array([Y_dict[x] for x in heat_level])
    Y = np.array(Y_list)

    # Test Prediction with kfold xVal
    # SVR
    # negvneu = Predict(dat,Y,algorithm='svr',subject_id = holdout, output_dir=outfolder, cv_dict = {'kfolds':5}, **{'kernel':"linear"})
    # negvneu = Predict(dat,Y,algorithm='svr',subject_id = holdout, output_dir=outfolder, cv_dict = {'loso':holdout}, **{'kernel':"linear"})
    # negvneu.predict()
    # print 'Elapsed: %.2f seconds' % (time.time() - tic) #Stop timer

    kfolds = 5 if 5 < len(Y) else len(Y)

    extra = {}
    if algorithm in ('svr', 'svm'):
        extra = {'kernel': 'linear'}

    negvneu = Predict(dat, Y, algorithm=algorithm,
                      subject_id=holdout,
                      output_dir=outfolder,
                      cv_dict={'kfolds': kfolds},
                      **extra)

    negvneu.predict()

    print 'Elapsed: %.2f seconds' % (time.time() - tic)  # Stop timer
