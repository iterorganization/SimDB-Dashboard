from setuptools import find_packages, setup

with open('README.md', 'r', encoding='utf-8') as f:
    long_description = f.read()

setup(
    name='simdb-dashboard',
    version='0.0.1',
    author='Jonathan Hollocombe',
    author_email='Jonathan.Hollocombe@ukaea.uk',
    description='Dashboard for querying and displaying SimDB simulations',
    long_description=long_description,
    long_description_type='text/markdown',
    url='https://git.iter.org/projects/IMEX/repos/simdb-dashboard/browse',
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    install_requires=[
        'flask',
    ],
)
