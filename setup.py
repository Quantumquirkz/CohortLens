"""CohortLens - Installation configuration."""
from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="cohortlens",
    version="0.1.0",
    author="CodeCrafters United",
    description="A modular CRM analytics platform for customer segmentation, spending prediction, and actionable insights",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/Jhuomar-Barria/CodeCrafters-United",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Intended Audience :: End Users/Desktop",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
    ],
    python_requires=">=3.9",
    install_requires=[
        "pandas>=2.0.0",
        "numpy>=1.24.0",
        "scikit-learn>=1.3.0",
        "matplotlib>=3.7.0",
        "seaborn>=0.12.0",
        "pandera>=0.17.0",
        "pyyaml>=6.0.0",
        "python-dotenv>=1.0.0",
        "fastapi>=0.104.0",
        "uvicorn>=0.24.0",
        "pydantic>=2.5.0",
        "click>=8.1.0",
        "jinja2>=3.1.0",
        "tabulate>=0.9.0",
        "joblib>=1.3.0",
        "tqdm>=4.66.0",
        "streamlit>=1.28.0",
    ],
    entry_points={
        "console_scripts": [
            "cohortlens=cohort_lens.cli:main",
        ],
    },
)
