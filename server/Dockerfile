FROM qgis/qgis:latest

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-gdal \
    gdal-bin \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for QGIS
ENV QGIS_PREFIX_PATH=/usr
ENV QT_QPA_PLATFORM=offscreen
ENV XDG_RUNTIME_DIR=/tmp/runtime-root
ENV PYTHONPATH="${PYTHONPATH}:/usr/share/qgis/python"
ENV LD_LIBRARY_PATH="/usr/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH}"

# Create runtime directory
RUN mkdir -p /tmp/runtime-root && chmod 700 /tmp/runtime-root

# Set the working directory in the container
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt /app/

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy the current directory contents into the container at /app
COPY . /app

# Create necessary directories
RUN mkdir -p uploads output uploads/nodes/static

# Expose port
EXPOSE 8000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]