# 1. Use an official Python runtime as a parent image
# We use the 'slim' version to keep the image size small
FROM python:3.10-slim

# 2. Set the working directory inside the container to /app
# Any command following this will happen inside this folder
WORKDIR /app

# 3. Copy the requirements file into the container
# We do this first to leverage Docker cache system
COPY requirements.txt .

# 4. Install any needed packages specified in requirements.txt
# --no-cache-dir reduces the image size by not saving download cache
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy the rest of the current directory contents into the container at /app
# This includes app.py, seed.py, templates, static, etc.
COPY . .

# 6. Make port 5000 available to the world outside this container
EXPOSE 5000

# 7. Define the command to run the application when the container starts
CMD ["python", "app.py"]